import type { MetadataWriteResult, PageRequest } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
type Row = Record<string, unknown>;
const fieldNames: Record<string, string> = { customerId: 'customer_id', displayName: 'display_name', preferredLocale: 'preferred_locale', userId: 'user_id', providerSubject: 'provider_subject', loginHint: 'login_hint', tenantId: 'tenant_id', systemKey: 'system_key', ownerUserId: 'owner_user_id', createdBy: 'created_by', updatedBy: 'updated_by', createdAt: 'created_at', updatedAt: 'updated_at' };
const column = (key: string) => fieldNames[key] ?? key;
function fail(code: string): never { throw new AccessControlError(code); }
export function metadataConnection(db: DatabaseSync) {
    const one = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).get(...args);
    const all = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).all(...args);
    const run = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).run(...args);
    const insert = (table: string, record: object) => { const entries = Object.entries(record).filter(([, value]) => value !== undefined); run(`INSERT INTO ${table}(${entries.map(([key]) => column(key)).join(',')}) VALUES (${entries.map(() => '?').join(',')})`, ...entries.map(([, value]) => value as SQLInputValue)); };
    const update = <T>(table: string, target: string | {
        id: string;
        column: string;
    }, changes: object, expected: number, read: () => T | null): MetadataWriteResult<T> => {
        if (!Number.isInteger(expected) || expected < 1)
            fail('INVALID_ADMIN_INPUT');
        const id = typeof target === 'string' ? target : target.id;
        const key = typeof target === 'string' ? 'id' : target.column;
        const entries = Object.entries(changes);
        const writeResult = run(`UPDATE ${table} SET ${entries.map(([key]) => `${column(key)}=?`).join(',')},version=version+1 WHERE ${key}=? AND version=?`, ...entries.map(([, value]) => value as SQLInputValue), id, expected);
        const value = read();
        return writeResult.changes && value ? { outcome: 'saved', value } : value ? { outcome: 'conflict' } : { outcome: 'not_found' };
    };
    const page = <T>(table: string, page: PageRequest, partition: string, convert: (row: Row) => T, field?: string) => {
        if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100)
            fail('INVALID_ADMIN_INPUT');
        let after = '';
        if (page.cursor) {
            try {
                const command = JSON.parse(Buffer.from(page.cursor, 'base64url').toString());
                if (command.table !== table || command.partition !== partition || typeof command.id !== 'string')
                    fail('INVALID_ADMIN_INPUT');
                after = command.id;
            }
            catch {
                fail('INVALID_ADMIN_INPUT');
            }
        }
        const rows = all(`SELECT * FROM ${table} WHERE ${field ? `${field}=? AND ` : ''}id>? ORDER BY id LIMIT ?`, ...(field ? [partition] : []), after, page.limit + 1);
        return { items: rows.slice(0, page.limit).map(convert), ...(rows.length > page.limit ? { nextCursor: Buffer.from(JSON.stringify({ table, partition, id: rows[page.limit - 1]!.id })).toString('base64url') } : {}) };
    };
    return { db, one, all, run, insert, update, page };
}
export type MetadataConnection = ReturnType<typeof metadataConnection>;
