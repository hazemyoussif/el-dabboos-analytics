import type { DashboardSpec } from './contracts.ts';

export type DashboardScope = 'private' | 'tenant';
export interface DashboardRecord {
  id: string;
  tenantId: string;
  ownerUserId: string;
  scope: DashboardScope;
  spec: DashboardSpec;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface DashboardUpdate {
  id: string;
  tenantId: string;
  ownerUserId: string;
  expectedVersion: number;
  spec: DashboardSpec;
  updatedBy: string;
  updatedAt: string;
}
/** Access checks are tenant-scoped and return no private record to another user. */
export interface DashboardRepository {
  listAccessible(tenantId: string, userId: string): Promise<DashboardRecord[]>;
  getAccessible(id: string, tenantId: string, userId: string): Promise<DashboardRecord | null>;
  create(record: DashboardRecord): Promise<DashboardRecord>;
  updateOwned(input: DashboardUpdate): Promise<DashboardRecord | 'conflict' | null>;
}
