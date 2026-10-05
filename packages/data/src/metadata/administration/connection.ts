import type { MetadataWriteResult, PageRequest } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
export type MetadataRow = Record<string, unknown>;
export interface MetadataSession {
    one(sql: string, ...args: SQLInputValue[]): Promise<MetadataRow | undefined>;
    all(sql: string, ...args: SQLInputValue[]): Promise<MetadataRow[]>;
    run(sql: string, ...args: SQLInputValue[]): Promise<{ changes: number | bigint }>;
}
const fieldNames: Record<string, string> = { customerId: 'customer_id', displayName: 'display_name', preferredLocale: 'preferred_locale', userId: 'user_id', providerSubject: 'provider_subject', loginHint: 'login_hint', tenantId: 'tenant_id', systemKey: 'system_key', ownerUserId: 'owner_user_id', createdBy: 'created_by', updatedBy: 'updated_by', createdAt: 'created_at', updatedAt: 'updated_at' };
const column = (key: string) => fieldNames[key] ?? key;
/** Internal adapter SQL, never accepts client-selected table/column names. */
export function administrationConnection(session: MetadataSession) {
    const { one, all, run } = session;
    const insert = async (table: string, record: object) => {
        const entries = Object.entries(record).filter(([, value]) => value !== undefined);
        await run(`INSERT INTO ${table}(${entries.map(([key]) => column(key)).join(',')}) VALUES (${entries.map(() => '?').join(',')})`, ...entries.map(([, value]) => value as SQLInputValue));
    };
    const update = async <T>(table: string, target: string | { id: string; column: string }, changes: object, expectedVersion: number, read: () => Promise<T | null>): Promise<MetadataWriteResult<T>> => {
        if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new AccessControlError('INVALID_ADMIN_INPUT');
        const id = typeof target === 'string' ? target : target.id;
        const key = typeof target === 'string' ? 'id' : target.column;
        const entries = Object.entries(changes);
        const writeResult = await run(`UPDATE ${table} SET ${entries.map(([key]) => `${column(key)}=?`).join(',')},version=version+1 WHERE ${key}=? AND version=?`, ...entries.map(([, value]) => value as SQLInputValue), id, expectedVersion);
        const value = await read();
        return writeResult.changes && value ? { outcome: 'saved', value } : value ? { outcome: 'conflict' } : { outcome: 'not_found' };
    };
    const page = async <T>(table: string, request: PageRequest, partition: string, convert: (row: MetadataRow) => T | Promise<T>, field?: string) => {
        if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 100) throw new AccessControlError('INVALID_ADMIN_INPUT');
        const after = decodeCursor(request.cursor, table, partition);
        const rows = await all(`SELECT * FROM ${table} WHERE ${field ? `${field}=? AND ` : ''}id>? ORDER BY id LIMIT ?`, ...(field ? [partition] : []), after, request.limit + 1);
        return { items: await mapMetadataRows(rows.slice(0, request.limit), convert), ...(rows.length > request.limit ? { nextCursor: Buffer.from(JSON.stringify({ table, partition, id: rows[request.limit - 1]!.id })).toString('base64url') } : {}) };
    };
    return { one, all, run, insert, update, page };
}
function decodeCursor(cursor: string | undefined, table: string, partition: string): string {
    if (!cursor) return '';
    try {
        const command = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (command.table === table && command.partition === partition && typeof command.id === 'string') return command.id;
    } catch { /* A malformed cursor is input failure, never an unrestricted page. */ }
    throw new AccessControlError('INVALID_ADMIN_INPUT');
}
export function metadataConnection(db: DatabaseSync) {
    return administrationConnection({
        one: async (sql, ...args) => db.prepare(sql).get(...args),
        all: async (sql, ...args) => db.prepare(sql).all(...args),
        run: async (sql, ...args) => db.prepare(sql).run(...args),
    });
}
export type MetadataConnection = ReturnType<typeof administrationConnection>;

/** A transaction owns one database session; evaluate row readers sequentially. */
export async function mapMetadataRows<Input, Output>(values: readonly Input[], convert: (value: Input) => Output | Promise<Output>): Promise<Output[]> {
    const result: Output[] = [];
    for (const value of values) result.push(await convert(value));
    return result;
}
