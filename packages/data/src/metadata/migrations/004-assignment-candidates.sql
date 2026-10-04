-- Explicit operational candidates; not an invitation, global email lookup or automatic membership.
CREATE TABLE tenant_assignment_candidates (
 tenant_id TEXT NOT NULL REFERENCES tenants(id),user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY(tenant_id,user_id)
);
