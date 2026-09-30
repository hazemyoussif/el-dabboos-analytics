# Request context and enforcement

`RequestContext` contains a principal (`userId`, `membershipId`), selected tenant, locale, and resolved authorization. The demo resolver checks a server-owned membership registry and expands roles into permissions. A user may hold several memberships; each request selects exactly one.

The API checks route permissions centrally, filters the semantic catalog, validates metrics in every submitted or generated DashboardSpec, and passes `analyticsContext(requestContext)` to the executor. That execution context carries only tenant ID, locale, and immutable policy constraints. Requested DashboardSpec filters and enforced filters remain separate; the engine applies both with conjunction. The same execution context scopes dimension-value discovery.

A future identity provider may replace `DemoIdentityProvider` without changing analytics formulas or DashboardSpec. It must establish user identity using trusted credentials before resolving memberships. The current headers do not do that.
