# Local staging Machine ID provisioning request

Status: **not provisioned; unattended-source acceptance is blocked**. No `tbot` or
`tsh` binary, Machine ID service, protected identity configuration reference or
Teleport cluster/proxy reference was found in the checked local staging paths.
The current private socket bridge forwards an existing authenticated SSH session;
its automatic restart is verified, but it is not a renewable machine identity.
The existing SSH configuration selects root and has no Teleport proxy command.
That is not evidence of an existing approved restricted Machine ID login.

Request to the Teleport administrator (prepared only; not sent):

- Provision a service/bot identity for **El-Dabboos Analytics local staging sync**.
  Proposed name, subject to administrator approval: `el-dabboos-local-staging-sync`.
- Return the approved Teleport **cluster/proxy reference** and exact staging-only
  node/resource labels. Target only the already approved Odoo staging host referred
  to by the protected local relay configuration; exclude production and broad node access.
- Confirm the **existing least-privilege staging SSH login** permitted to establish
  the PostgreSQL relay. A restricted login has not been identified locally; do not
  silently reuse root or expand access. If a login must be provisioned, the
  administrator owns that decision and provisioning.
- Limit relay access to the required staging PostgreSQL destination/port. Do not
  grant unrelated resources, cluster administration or database write authority.
- Supply the approved **local tbot configuration/reference mechanism**, renewable
  identity/SSH configuration output reference and managed startup/renewal method.
  Output belongs in a protected local directory outside Git and container images.
  Suggested location for approval: `~/.config/el-dabboos-local-staging/machine-id/`.
- Supply references and safe bot/resource/login metadata only. Do not send private
  keys, certificates, join tokens, passwords or other credentials through chat/email.
- Confirm a **SELECT-only PostgreSQL identity**, including no DML, DDL, superuser,
  role-creation or RLS-bypass authority. The previously approved staging transaction
  exception is not evidence of least-privilege grants; final SELECT-only acceptance
  must use verified dedicated grants, without the agent changing source permissions.

After provisioning: consume generated SSH configuration/output references in the
local managed relay; verify renewal and restart without a personal login, then
capture relay outage/recovery, API restart and authenticated API operation evidence.
Do not enable a scheduler, grant permissions locally, introduce a static key,
weaken host verification, modify source schema or expose source credentials.
