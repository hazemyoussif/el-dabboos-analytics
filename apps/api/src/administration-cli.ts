import { bootstrapAdministration, provisionAssignmentCandidate, provisionTenantAdministrator } from '@el-dabboos/application';
import { SqliteAdministrationStore } from '@el-dabboos/data';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
// Operational boundary: verification of an external issuer/subject is the operator's responsibility.
// No secret/password/session token is accepted, logged or created here.
const [path, action, ...args] = process.argv.slice(2);
if (!path || !['bootstrap', 'tenant-admin', 'candidate'].includes(action ?? ''))
    throw new Error('Usage: metadata:bootstrap <migrated-db> bootstrap <verified-binding.json> <audit-reference> | tenant-admin <actor-binding-id> <tenant-id> <target-binding-id> <expectedVersion> | candidate <actor-binding-id> <tenant-id> <target-binding-id>');
const db = new DatabaseSync(path);
try {
    const store = new SqliteAdministrationStore(db);
    if (action === 'bootstrap') {
        if (args.length !== 2)
            throw new Error('Verified binding file and audit reference required.');
        const input = JSON.parse(readFileSync(args[0]!, 'utf8'));
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['displayName', 'provider', 'providerSubject', 'preferredLocale'].includes(key)) || !['displayName', 'provider', 'providerSubject'].every(key => typeof input[key] === 'string' && input[key].trim().length > 0 && input[key].length <= 200) || !['en', 'ar'].includes(input.preferredLocale))
            throw new Error('Invalid verified binding input.');
        await bootstrapAdministration(store, input, args[1]!);
    }
    else if (action === 'tenant-admin') {
        if (args.length !== 4 || !/^\d+$/.test(args[3]!))
            throw new Error('Actor, tenant, target binding and expectedVersion required.');
        await provisionTenantAdministrator(store, args[0]!, args[1]!, args[2]!, Number(args[3]));
    }
    else {
        if (args.length !== 3)
            throw new Error('Actor, tenant and target binding required.');
        await provisionAssignmentCandidate(store, args[0]!, args[1]!, args[2]!);
    }
    process.stdout.write('Operational metadata change committed. No authentication or email delivery was performed.\n');
}
finally {
    db.close();
}
