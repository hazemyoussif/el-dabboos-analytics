# Personas and current demo roles

Current identities are synthetic header-based selections, **not production authentication**. Server membership is validated on every API request. Exact implementation: [application security](../../packages/application/src/security.ts), [domain security](../../packages/domain/src/security.ts). Production IdP/SSO and revocation are unresolved integration decisions.

| Persona | Demo identity | Tenant scope | Current rights / limits |
| --- | --- | --- | --- |
| Tenant Administrator | demo-iq-admin | demo-iq | All demo permissions/domains, including tenant-shared record creation via API; no production user-management UI |
| Analyst | demo-iq-analyst | demo-iq | View/create/edit, analytics, AI generate/edit; all metric domains; no share permission |
| Analyst | demo-eg-analyst | demo-eg | Same analyst rights with Egypt profile |
| Manager / Branch-scoped Manager | demo-iq-baghdad-manager | demo-iq | View/create/edit/query; branch=baghdad enforced; no AI permissions |
| Sales Analyst | demo-iq-sales-analyst | demo-iq | Analyst operations with sales/CRM metric domains only |
| Regional/Multi-tenant Analyst | demo-regional-analyst | demo-iq and demo-eg | Validated separate memberships; no cross-tenant aggregation |
| Developer/Operator | No implicit privileged identity | Deployment/test fixture | Configure/diagnose via approved runtime access; application API rights still require membership |

Sharing scope grants view eligibility, not ownership or metric permission. An accessible shared non-owned dashboard may be copied with Save As; updating the original remains owner-controlled. Folder/favorite preferences belong to tenant + user and are not sharing policy. Tenant/user administration permissions exist in the model; production administration workflows are future work.

## Administration model designed for the next implementation phase

[ADR 028](../architecture/adr/028-customer-tenant-access-control.md) adds synthetic contract-test personas for Platform Admin, Baghdad Agent Manager and a tenant custom-role Agent. Platform Admin has metadata authority only. Agent Manager has sales/CRM capabilities, explicit dashboard audiences and branch plus optional salesperson scopes; collections is not implicitly enabled. These are architecture fixtures, not yet selectable production/admin UI personas. Exact page and permission behavior: [administration contract](../security/administration-contract.md). Existing demo identities above remain working.
