# ADR 018: Request context and permission-based authorization

Status: accepted for the synthetic prototype.

The application separates User, Tenant, TenantMembership, Role, Permission, RequestContext, and AuthorizationPolicy. The demo identity provider validates the selected tenant against memberships; role IDs are expanded to permissions before API authorization. Authentication is pending and headers are only local simulation.

The API scopes semantic and dimension discovery, templates, analytics queries, and dashboard execution. Schema and semantic validation precede metric authorization for submitted and planner-produced specs. Planner capabilities contain only authorized metrics, templates, and actions. The repository receives a small execution context with tenant and already-resolved filters. User-requested filters remain in DashboardSpec and are intersected with enforced filters during evaluation. DashboardRecord and AuditEvent contracts remain outside the portable spec.

The API injects analytics and dimension-value repositories separately. A single physical adapter may implement both. Future persistence and identity adapters can replace the demo implementations without changing metric recipes.
