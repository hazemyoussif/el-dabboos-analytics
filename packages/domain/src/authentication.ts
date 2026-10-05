import type { ProductUser, IdentityBinding } from './access-control.ts';
export interface AuthenticatedExternalIdentity { provider: string; subject: string }
export interface ExternalAuthenticationProvider { authenticate(cookie: string | undefined): Promise<AuthenticatedExternalIdentity | null> }
export interface AuthenticationPrincipal { user: ProductUser; binding: IdentityBinding }
export interface AuthenticationDirectory { resolve(identity: AuthenticatedExternalIdentity): Promise<AuthenticationPrincipal | null> }
export interface LocalIdentityProvision {
    userId: string; expectedUserVersion: number; email: string; operatorReference: string;
    activateUser: boolean; enableIdentity: boolean;
}
export interface LocalIdentityProvisioner {
    provision(command: LocalIdentityProvision, credential: { subject: string; passwordHash: string }): Promise<{ subject: string; identityId: string }>;
}
export type AuthenticationSecurityEvent = 'login_succeeded' | 'login_failed' | 'logout' | 'sessions_revoked' | 'local_identity_provisioned';
export interface AuthenticationSecurityAudit { record(event: AuthenticationSecurityEvent, userId?: string): Promise<void> }
export interface LocalSessionRevoker { revoke(subject: string): Promise<void> }
