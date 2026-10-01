export interface DashboardLibraryPreference { tenantId: string; userId: string; dashboardId: string; folderId?: string; favorite: boolean }
export interface DashboardFolder { id: string; tenantId: string; ownerUserId: string; name: string; createdAt: string; updatedAt: string }
export interface DashboardLibraryScope { tenantId: string; userId: string }
/** Personal organization, separate from dashboard content and sharing. */
export interface DashboardLibraryRepository {
  listFolders(scope: DashboardLibraryScope): Promise<DashboardFolder[]>;
  createFolder(folder: DashboardFolder): Promise<DashboardFolder>;
  renameFolder(scope: DashboardLibraryScope, id: string, name: string, updatedAt: string): Promise<DashboardFolder | null>;
  deleteFolder(scope: DashboardLibraryScope, id: string): Promise<boolean>;
  listPreferences(scope: DashboardLibraryScope): Promise<DashboardLibraryPreference[]>;
  getPreference(scope: DashboardLibraryScope, dashboardId: string): Promise<DashboardLibraryPreference | null>;
  /** Atomically rejects folder IDs outside the same personal scope. */
  setPreference(preference: DashboardLibraryPreference): Promise<DashboardLibraryPreference | null>;
}
