# ADR 033: Separate certification of established derived outputs

## Decision

Approved additive inputs do not automatically publish a derived metric. The existing source-neutral published-capability projection remains the single model for templates, planner, manual builder and preflight.

A trusted dedicated mart migrator may append a derived output certification to an already approved release without editing its mapping, original approval event, case IDs, batches, facts or serving binding. Migration 011 introduces immutable, tenant-scoped `mart.derived_metric_certifications`. It supports only the two established canonical average recipes: confirmed order revenue / confirmed order count, and posted invoice value / posted invoice count. It is an evidence ledger, not a parallel capability registry.

Each output certification has explicit authority and semantics, a period, a summary or exact grouping, and the complete existing approval-linked operand case set. SQL requires the declared mapping capability and matching business-certified release, every operand group, exact values/counts, approved zero tolerances, and independently recomputed current mart inputs equal to the frozen approved values/counts. Migration 012 also rejects unexpected current-mart groups. Missing groups or changed inputs block publication. Cases cannot be fabricated by supplying only a convenient subset. Appending approval cannot override a technical failure.

Runtime receives only safe metric/group/period/output-reference coverage through a tenant/binding-checked security-definer function. It cannot read private approval specifications or source case payloads. The projection intersects output evidence with both base measures and mapping declarations, so output summary approval cannot enable a grouped pair. Exact output references accompany result provenance; the original release certification reference remains visible separately. The repository also checks these two outputs, so bypassing API preflight cannot execute unapproved groupings or analyses.

Ratios are calculated from aggregate canonical operands. They are never extracted as summable facts, and zero denominators return null. The evidence uses exact rational operands rather than claiming recurring decimals are exactly representable display values. Runtime floating point remains subject to the existing six-decimal numeric-input boundary; presentation may round an average without rounding stored source evidence.

## Limits

This narrow extension does not append new source reconciliation cases to the original approved case set, approve new business meanings, or broaden analyses. Newly observed month/customer controls remain technical evidence pending a new governed release/evidence lifecycle. No historical source revision is fabricated to attach a fresh query to an old retained PostgreSQL snapshot. New order-margin or receivable inputs require business approval and an explicitly bounded extraction; current residuals cannot become historic September balances.

The Wave 1 user request conditionally authorizes established unambiguous average recipes; its exact reference is recorded on the new output attestations. It does not approve margin, receivable credit policies or refund percentage meanings. [Wave 1 report](../../integration/odoo-certification-wave-one.md) records the live execution and pending candidates. No finance approval or external report is invented.

## Runtime proof reuse

[ADR 034](034-verified-certification-results.md) retains these exact guards while allowing offline verified positive results to be reused until any proof dependency changes. Transactional invalidation and full-proof fallback preserve the post-certification unexpected-group refusal.
