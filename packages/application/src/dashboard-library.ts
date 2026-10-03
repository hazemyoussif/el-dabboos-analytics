import type { DashboardLibraryRepository, DashboardLibraryScope, RequestContext } from '@el-dabboos/domain';
import type { SavedDashboardService } from './saved-dashboards.ts';
import type { GovernedSavedDashboardService } from './governed-saved-dashboards.ts';
export class DashboardLibraryError extends Error {
  constructor(readonly code: 'FOLDER_NOT_FOUND' | 'INVALID_LIBRARY_INPUT', message: string) { super(message); }
}
const scope = (context: RequestContext): DashboardLibraryScope => ({ tenantId: context.tenant.tenantId, userId: context.principal.userId });
function nameInput(name: unknown): string {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) throw new DashboardLibraryError('INVALID_LIBRARY_INPUT', 'A name of 1–120 characters is required.');
  return name.trim();
}
export class DashboardLibraryService {
  constructor(private readonly repository: DashboardLibraryRepository, private readonly dashboards: SavedDashboardService | GovernedSavedDashboardService,
    private readonly clock: () => Date = () => new Date(), private readonly createId: () => string = () => crypto.randomUUID()) {}
  async list(context: RequestContext) {
    const records = await this.dashboards.list(context);
    const [folders, preferences] = await Promise.all([this.repository.listFolders(scope(context)), this.repository.listPreferences(scope(context))]);
    return { folders, preferences: preferences.filter(item => records.some(record => record.id === item.dashboardId)) };
  }
  async createFolder(name: unknown, context: RequestContext) {
    await this.dashboards.list(context);
    const timestamp = this.clock().toISOString();
    return this.repository.createFolder({ id: this.createId(), tenantId: context.tenant.tenantId, ownerUserId: context.principal.userId, name: nameInput(name), createdAt: timestamp, updatedAt: timestamp });
  }
  async renameFolder(id: string, name: unknown, context: RequestContext) {
    await this.dashboards.list(context);
    const folder = await this.repository.renameFolder(scope(context), id, nameInput(name), this.clock().toISOString());
    if (!folder) throw new DashboardLibraryError('FOLDER_NOT_FOUND', 'Folder was not found.');
    return folder;
  }
  async deleteFolder(id: string, context: RequestContext) {
    await this.dashboards.list(context);
    if (!await this.repository.deleteFolder(scope(context), id)) throw new DashboardLibraryError('FOLDER_NOT_FOUND', 'Folder was not found.');
  }
  async setPreference(id: string, input: unknown, context: RequestContext) {
    await this.dashboards.get(id, context);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DashboardLibraryError('INVALID_LIBRARY_INPUT', 'Invalid library preference.');
    const value = input as Record<string, unknown>;
    if (Object.keys(value).some(key => !['favorite', 'folderId'].includes(key)) || typeof value.favorite !== 'boolean' ||
      (value.folderId !== undefined && value.folderId !== null && (typeof value.folderId !== 'string' || !value.folderId))) throw new DashboardLibraryError('INVALID_LIBRARY_INPUT', 'Invalid library preference.');
    const preference = await this.repository.setPreference({ ...scope(context), dashboardId: id, favorite: value.favorite, ...(typeof value.folderId === 'string' ? { folderId: value.folderId } : {}) });
    if (!preference) throw new DashboardLibraryError('FOLDER_NOT_FOUND', 'Folder was not found.');
    return preference;
  }
}
