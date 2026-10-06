# Governed certification and staging publication

[ADR 031](../architecture/adr/031-certified-release-promotion.md) defines the authorized-business-approval and external-report evidence paths. Exact source-to-mart reconciliation remains mandatory for both; a human cannot approve away technical failure. Odoo UI screenshots/labels are optional supporting evidence for the authorized path.

Use only dedicated source and target migrator credentials, supplied through protected operator configuration as `MART_PUBLICATION_SOURCE_URL` and `MART_PUBLICATION_TARGET_URL`. Never put them in runtime configuration, manifests, argv or Git. The CLI does not implicitly load developer env files. Explicit operator composition may use Node's `--env-file` with a protected file. No command reads Odoo.

First apply the current mart migration manifest independently to both databases with the existing governed migrator. Refresh the local API image when its readiness manifest changes; preserve runtime secrets and control data.

The certification manifest is the domain-owned `ReleaseCertification`: tenantId, datasetId, mappingVersion, reference, approverReference, approvedAt (UTC ISO timestamp), companyIds, from/to, caseIds, technicalReference, evidenceKind, approvedValues and businessSemantics. `external_report` additionally requires externalReportReference. Approver authority must come from an explicit externally authorized instruction; tenant-admin membership alone does not confer publication authority. The operator inserts an immutable database-audited event, and exact technical controls validate every field that affects the published scope/values.

For approve/promote/bind, use a bounded manifest with exactly tenantId, datasetId and reference. Approval reference selects the completed certification. Promotion reference identifies the target receipt. Keep evidence manifests and detailed operational artifacts outside Git.

```bash
pnpm mart:publication certify /protected/certification.json
pnpm mart:publication approve /protected/certification-scope.json
pnpm mart:publication promote /protected/promotion-scope.json
pnpm mart:publication bind /protected/promotion-scope.json
```

`certify` appends evidence; a repeated insert fails rather than overwriting history. `approve` updates only the original candidate's certification metadata. `promote` copies one approved release transactionally, verifies every row and records a receipt; repeating an identical transfer returns alreadyPromoted. An existing target release without a matching receipt is refused, never replaced. `bind` is a separate explicitly authorized operation and is idempotent only for the same tenant/dataset; a different active binding is refused.

No operation mutates source facts, reruns extraction, changes authentication, provisions accounts, enables sync or deploys externally. Incomplete same-release history retained as lineage stays unavailable to runtime. Production deployment and approval ownership remain separately governed.

Discovery metadata returns an explicit unavailable response with `uncertified_dimension` or `discovery_limit` when it cannot provide a certified, complete option set. It never truncates customer options or authorizes unsupported queries. Unsupported enforced policy dimensions and unexpected adapter failures still fail closed.
