# Request context and enforcement

`RequestContext` contains a principal (`userId`, `membershipId`), selected tenant, locale, and resolved authorization. The governed runtime checks persisted binding/user/customer/tenant/membership lifecycle and expands the selected membership’s current roles into permissions and metric domains. Demo headers select only persisted synthetic bindings; they are not production authentication. A user may hold several memberships; each request selects exactly one.

The API checks route permissions centrally, filters the semantic catalog, validates metrics in every submitted or generated DashboardSpec, and passes `analyticsContext(requestContext)` to the executor. That execution context carries only tenant ID, locale, and immutable policy constraints. Requested DashboardSpec filters and enforced filters remain separate; the engine applies both with conjunction. The same execution context scopes dimension-value discovery.

A future identity provider may replace `DemoIdentityProvider` without changing analytics formulas or DashboardSpec. It must establish user identity using trusted credentials before resolving memberships. The current headers do not do that.

## Managed access resolution

The new `resolveTenantAccess` builds this same RequestContext from a fresh coherent metadata snapshot and keeps selected role IDs in a separate request-local resource-access envelope. Platform resolution produces a separate PlatformContext with no tenant authority. [ADR 028](../architecture/adr/028-customer-tenant-access-control.md) defines lifecycle checks, revocation boundaries and the atomic adapter/composition cutover; the governed runtime now uses the versioned metadata directory/profile provider and grant-aware saved service. The legacy static demo resolver remains a synthetic compatibility fixture, not deployed administration authority. See [operations](administration-operations.md) and [verification status](access-control-implementation-status.md).
