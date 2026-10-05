import type { AuthenticationDirectory, ExternalAuthenticationProvider, LocalIdentityProvision, LocalIdentityProvisioner } from '@el-dabboos/domain';
export async function resolveAuthenticatedPrincipal(provider: ExternalAuthenticationProvider, directory: AuthenticationDirectory, cookie?: string) {
    const external = await provider.authenticate(cookie);
    if (!external) return null;
    const principal = await directory.resolve(external);
    return principal?.user.status==='active' && principal.binding.status==='active' ? principal : null;
}
/** Privileged offline operation: no password, subject or binding supplied by the HTTP caller. */
export async function provisionLocalIdentity(provisioner: LocalIdentityProvisioner, command: LocalIdentityProvision, password: string, hash: (value: string) => Promise<string>) {
    if (Object.keys(command).sort().join(',')!=='activateUser,email,enableIdentity,expectedUserVersion,operatorReference,userId' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(command.userId) || !Number.isSafeInteger(command.expectedUserVersion) || command.expectedUserVersion<1 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.email) || command.email.length>254 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(command.operatorReference) || typeof command.activateUser!=='boolean' || typeof command.enableIdentity!=='boolean') throw new Error('Invalid local identity provisioning');
    if (typeof password!=='string' || password.length<8 || password.length>1024) throw new Error('Password must contain 8–1024 characters');
    return provisioner.provision({ ...command,email: command.email.toLowerCase() },{ subject: crypto.randomUUID(),passwordHash: await hash(password) });
}
