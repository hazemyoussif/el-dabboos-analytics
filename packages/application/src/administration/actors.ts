import type { AdministrationActor } from './commands.ts';
import { AdministrationRuntime } from './runtime.ts';
export async function resolveTenant(runtime: AdministrationRuntime, actorInput: AdministrationActor) { return runtime.uow.write(transaction => runtime.tenantActor(transaction, actorInput)); }
export async function resolvePlatform(runtime: AdministrationRuntime, id: string) { return runtime.uow.write(transaction => runtime.platformActor(transaction, id)); }
