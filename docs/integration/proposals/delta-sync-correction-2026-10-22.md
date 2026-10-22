# Delta sync correction — 22 October 2026

Status: capture draft committed as `4a82e932`; subsequent code now
connects Command recipe discovery, Business delta publication, allocation sweeps
and observation metadata to the job composition. The owner subsequently approved
shared Business raw/prepared reader changes; migrations 068–076 and the sparse
writer/preparation integration implement that code change. The owner approved
focused synthetic verification and local gates. Disposable PostgreSQL 18.6 applied
these migrations; focused checks and the application test suite have run. Final
gate results are recorded in the release handoff. No company source job, rehearsal,
deployment or timer change was performed. Company performance remains unproven.

## Current integration draft

The findings and intermediate drafts below record the development sequence. This
section supersedes their earlier statements that normal-sync composition is absent.

`runConfiguredAnalyticsJob` now coordinates a Command refresh before starting a
new operational sync, and includes its member results separately in the response.
The Business recipes use their own accepted observations; the facts cursor never
marks them fresh. A pending sealed operational candidate defers this new source
operation so its existing offline resume remains source-free.

The Command adapter discovers header, journal-item, allocation and lookup changes
in the existing inclusive polling overlap. Root requests are deduplicated in SQL.
Every accepted Business month is considered so an event moved between months is
removed from its previous month and inserted in its new covered month. Header
recognition also checks the newly entered calendar days: an unchanged future-dated
invoice, receipt or order must become visible when its date arrives. The reporting
timezone comes from the approved mapping.

The static dependency review also includes customers owned by a changed salesperson,
including changes to that salesperson's display name. A debt date rollover must
include lines settled by allocations dated after the reporting day: a zero stored
current residual does not imply a zero reconstructed residual at that day. These
cases are implemented in identity discovery and covered by the synthetic
`command-changes.test.ts` regression.

Each root read returns its complete mapped outputs, including empty replacements.
Prior facts are fetched by bounded canonical keys. Observation-only changes retain
the accepted payload. Independent source aggregates cover each unique requested
root scope. Expected controls are the accepted controls minus the previous requested
facts plus those independent new aggregates. Exact scoped controls and the database
baseline/delta proof remain prerequisites for changed publication. This avoids querying
every source recipe over every historical month during an ordinary unchanged poll.

Recipe observation clocks are introduced by additive migration 067. Unrelated
Business recipes retain their prior controls, facts, source cutoff and observation
day. Native and prepared snapshot selection and provenance read those operand
observations. Current debt is reanchored when the tenant-local date changes; old
debt observations remain historical. Event document states/residuals describe the
source observation of their invoice-date cohort, as the existing catalog states.

When the content and observation day are unchanged, exact observation checks renew
the Command clocks against the existing accepted partition. This creates neither
another raw month nor another prepared dataset. Changed members store only new
canonical payloads and complete dirty-root replacement markers; empty replacements
are deletions. `review_fact_population` resolves inherited records from the accepted
parent without copying or retiming them. Scoped source evidence proves the requested
population and the accepted parent's controls prove the retained population.

Business prepared datasets also reference a sealed parent. Daily/monthly/cutoff
cell keys come from both old and new footprints across the governed grains.
Only contributors to those keys are reduced; this recomputes minima, maxima,
distinct populations and label conflicts rather than attempting to subtract a
previous maximum or caption. Empty snapshot transitions invalidate their synthetic
zero cells too. New physical prepared rows and key tombstones replace those cells;
all other cells remain in the parent. Counts describe the logical dataset and are
derived from accepted counts minus replaced cells plus replacements. Dataset IDs
identify the governed configuration, parent and source-input manifest, rather than
hashing a copied complete cell population.

The source lease is released before preparation. The existing family/kind/period
binding contract remains, while its Business data can be physically sparse.
Kind-specific input signatures preserve reuse when an event-only edit changes a
shared member without changing snapshot inputs. An established sparse input with
no compatible sealed prepared parent fails explicitly; it does not invoke the
complete-month builder. Other prepared families keep their original cell reader.
The scoped aggregate may still need all contributors to an affected monthly
summary measure. No unchanged raw or prepared payloads are copied for that work.
Snapshot configuration includes only measures with an eligible observation at
that cutoff. A later debt observation does not become earlier stock-date coverage.
Storage, ancestry read cost and company performance have not been established.

An existing Business mapping without Command measures receives only the registered
additive Command extension. Its original rules, capabilities and facts are retained.
New recipe outputs require their first calculation within each existing covered
month; old Business source recipes are not re-extracted. A new current month can
establish Command recipes only, guarded against overwriting any existing member.
Other Business recipes retain their last published observation until their own
loader observes them. This first calculation is distinct from steady-state polling
and has not been measured or recommended for company execution.

Allocation edges are versioned separately against their accepted Business source
observations. The initial inventory reads current allocation identities/links, not
historical financial facts. Old and new edges request the affected invoice and debt
roots. An existing allocation modified after the accepted cutoff without retained
prior links requires explicit recovery; current links are never backdated into a
claimed old graph. A new or previously unchanged input can establish actual links.

The separately requested allocation sweep also drives Command replacement requests.
It checks recorded IDs through the retained read-only snapshot and uses prior links
and subsequent accepted link versions for deletions. It retains recorded-identity
coverage, not a claim of complete source deletion history. Already deleted links
that were never retained remain unrecoverable from the current source table.

Migrations 065–076, source SQL, RLS/role access, rollback, preparation, date rollover,
storage requirements and company timings remain unverified. No company retry or
timer restart is recommended by this draft. GitHub CI remains disabled.

The owner requires the existing baseline to be reused: discover changed records,
compare their prior/current footprints, and prepare only affected outputs. The
failed company run on API `cffb5cf28c81f29163a65342246f283653469367` exhausted the
JavaScript heap after source handoff and classification, before a committed capture.
The previous synthetic memory result did not establish company completion.

## Code changes

- Lookup fingerprint absence no longer clears the accepted source cursor. Lookup
  discovery polls its normal timestamp window and treats an untracked polled
  identity as changed. Unmodified lookups do not trigger historical fan-out.
  A known projection-version change requires explicit migration; a checkpoint
  that conflicts with the accepted cursor fails closed. Fingerprints are populated
  lazily for changed identities and accepted with that cursor.
- Receivable input discovery also retains the accepted cursor without a metadata
  checkpoint. Known previous dates and current dates determine affected cutoffs.
  A source input created after the accepted cutoff has no prior footprint. An
  older changed input with no known previous date conservatively retains the full
  published-cutoff check. This does not manufacture previous dates from totals.
- Checkpoint capture consumes canonical pages of at most 1,000 facts. PostgreSQL
  transaction-local tables hold final candidate heads, distinct changed identities,
  dirty partitions/dates and dependency pages. A page reads only its staged heads,
  compares with accepted heads, computes old/new impact, and releases its payloads.
  Diagnostics retain aggregate counts, not all previous/next facts. Final revision
  writes also use bounded SQL pages. The frozen specification stores partitions
  once; acceptance reconstructs audit details.
- Existing exact controls, immutable capture sealing, private working heads,
  prepared dataset reuse and final atomic acceptance are retained. No stored
  migration, RLS policy, source deadline or heap limit is changed. Temporary-table
  permission and PostgreSQL temporary storage remain runtime prerequisites.

SQL staging is **not independently committed ingestion**. It disappears if capture
fails before sealing. Only the complete frozen capture is durable/resumable under
the existing lifecycle. This removes the full fact-payload memory buffer; it does
not prove capture duration, disk consumption or a constant total heap. Scope and
control metadata still scale with affected groups. No performance claim is made.

## Remaining dashboard refresh gap

Operational refresh still replaces `facts` members only. Sales Command Center
measures use the `business` family. Its existing loader is a complete-month source
extraction, not a changed-record merge. Its source watermark is the selected
`review_extractions.source_cutoff`, which can differ from the operational cursor.

Migration 061's `business_partition_exact` requires every fact's `sourceAsOf` and
`frozenRevision` to match the whole extraction. Copying old rows into a new
extraction or changing their timestamps would misstate what was observed. The
current draft does neither and does not claim business/report freshness.

A correct family merge must use each family's own accepted cutoff, discover all
input changes for its recipes (including payments, allocations, lines and lookup
ownership), retain old/new dependency edges, replace affected identities including
removed outputs, and prove the unchanged base plus delta before preparing affected
chunks. Current-cutoff debt also changes with the reporting date without an input
write. Source discovery remains incomplete; the subsequent lineage draft below
does not close that gap. Ordinary
sync cannot be presented as a completed Sales Command Center refresh until they are.

## Business merge workspace draft

`packages/data/src/business/delta-store.ts` now supplies the database merge step:

- Resolve the accepted Business partition and its own cutoff under the current
  trusted revision. Reject an incompatible definition, changed mapping, stale
  parent or regressing observation. The operational cursor is not reused.
- Stage complete recipe-identity replacements in transaction-local tables with
  at most 1,000 canonical facts per call. Empty replacements remove prior outputs;
  a changed state cannot leave measures that the recipe no longer emits. Duplicate
  identity submissions fail instead of silently overwriting a partial replacement.
- Read unchanged rows directly from the accepted partition and retain their
  original payload and observation metadata. Compute affected days from both
  previous and replacement footprints. A moved event requires an explicit
  replacement in each affected month; the workspace never guesses that discovery.
- Require independent summary and dimension-group controls for the complete
  merged result, with exact amounts/counts and no duplicate or unmapped controls.
  Emit merged rows in bounded pages only after successful reconciliation.
  A failed capture or seal cannot be resumed inside this workspace.

The workspace is now connected to a separate internal `exposeBusinessDeltaMonth`
entry point, but not to normal sync or an operator command.
It does not discover source changes, reconstruct missing dependency edges,
advance a watermark, create an extraction, prepare outputs or publish anything.
It requires the caller's existing tenant transaction/advisory lock and its source
snapshot. Temporary tables disappear on rollback or commit. It neither alters
migration 061 nor misrepresents inherited rows as freshly extracted facts.

Remaining integration: dependency-complete source discovery/replacement pages for
all recipes in a published Business mapping; verification of the mixed-lineage proof;
then checkpointed preparation and atomic publication in normal sync. Current-day
snapshot invalidation also remains required. These are implementation gaps, not
requests for another company retry. No company command is recommended yet.

### Mixed-lineage publication draft

Additive migration `065_business_delta_lineage.sql` records the exact accepted
parent revision/partition and complete replacement identities. Metadata is forced
through tenant RLS, append-only history and the existing published-content lock.
Origin insertion requires the current accepted Business member, the same month,
source, currency, definition and mapping, and a strictly newer observation.

The existing `business_partition_exact` mapping/measure/capability and exact grouped
control checks are retained. Its lineage clause delegates to a new proof: fresh
rows for declared replacement identities must match the new extraction evidence;
all other rows must equal an accepted parent row exactly. Every unchanged parent
row must also be retained, so compensating totals cannot hide an omission. Legacy
full extractions retain the fresh-observation rule. Released migrations are unchanged.

The new internal delta-exposure path uses the existing exposure transaction,
advisory lock, exact source controls, activated preparation, parent comparison and
atomic promotion. It has no source-discovery implementation or automatic caller.
It does not bypass the initial full mapping or copy a subset over other Business
measures. No migration was executed, no database state changed and no verification
claim is made. This is not a company rollout recommendation.

### Identity-scoped Command source reads

The five Command recipes now share their original SQL definitions with explicit
identity-scoped builders. Invoice/payment/order/allocation predicates bind selected
IDs at their source roots. Receivable IDs restrict the initial eligible journal-item
population before settlement reconstruction. Unscoped recipes retain their original
SQL content and business formulas; only the selected variants add the tenth bound
ID-array parameter. No source SQL is supplied by a user or model.

`OdooBusinessReader.replacements` accepts at most 1,000 distinct positive source
IDs for one mapped Command recipe under the reader's existing month/snapshot scope.
It returns complete recipe outputs and explicit empty replacements for requested
identities that no longer qualify in that month. Its bounded buffer covers one
ID request, not the full candidate. Merge staging now bulk-inserts identities and
facts per canonical page rather than issuing inserts per identity. Other Business
recipes deliberately remain unsupported by this replacement reader.

Migration 065 also rejects first publication of an unpublished delta partition
against a serving parent other than its recorded origin. Carried immutable
partitions retain the existing membership reuse behavior. No migration or source
read was executed for these code changes; verification remains pending.

### Allocation-link retention gap established from the repository

Migration 062 and its source/store adapter retain allocation IDs and effective
dates, not debit/credit journal-item or parent-entry links. Review/Business recipes
join those source links while calculating facts but do not persist the raw link
graph. A company script is not needed to establish this implementation gap.

Additive migration 066 adds nullable `allocation_links` and
`allocation_links_cutoff` to the existing tenant-scoped dependency table. New
incremental allocation observations carry their actual debit/credit journal-item
IDs and the corresponding parent journal-entry IDs. The existing accepted-cursor
transaction persists those links after successful reconciliation. There are no
amounts or display labels in the link object. Database constraints require four
positive source IDs, allocation-only ownership and an observation time no later
than the accepted dependency cutoff.

Previously captured dependency pages without link fields retain any already-known
links and their original observation time, rather than falsely dating them as a
new observation. Existing rows remain unknown until observed with links; no edges
are inferred from balances or created by migrating old prepared data. The source
polling window is unchanged. Already-deleted links cannot be recovered from this
schema addition or from the current Odoo table. Business impact discovery must
consume previous links before accepted metadata is updated and keep unknown
coverage explicit. No migration, source job or verification was executed.

### Consuming retained links in the deletion path

The existing allocation presence sweep can now pass each bounded missing-ID page
to the internal Business exposure path. It reads source-observed links and their
observation times from the exact dependency namespace; default operational sweep
output still exposes only aggregate evidence. The Business consumer rejects links
missing from the record or dated differently from its last dependency observation,
and rejects dependency evidence newer than the current source snapshot.

Direct edge-derived requests include the removed Command allocation, its two
parent invoice candidates, and its two journal-item candidates for mapped Command
receivables, Business receivables and payables. Only recipes actually in the
accepted mapping are requested. These are direct dependencies, not a claim of
complete indirect effects such as payment-status/customer aggregates.

Impact requests are deduplicated across sweep pages in a transaction-local SQL
table. Ordinary replacements are staged first; the deletion reader then reads only
requested identities not already replaced. Empty recipe outputs still mark an
identity as processed. Sealing rejects any outstanding request. Source readers now
also support identity-scoped Business receivable/payable recipes; the receivable
root predicate precedes settlement reconstruction.

This connection is through the internal `BusinessDeltaExtraction` input. There is
still no normal-sync composition or public operator command for Business deltas.
All unchanged-row lineage and exact full-result controls remain mandatory; no
subset of discovered effects can silently bypass them. Previously absent links
remain an explicit recovery case. No tests, migration execution or source jobs
were performed for this connection.

## Read-only source inspection — 22 October 2026

The owner authorized inspection through the existing protected source connection.
Inspection used read-only transactions and a five-second statement timeout; it
did not run source jobs, financial reconciliation, tests or mutations. Credentials,
financial values, audit values and business record identities were not printed.

- `account_partial_reconcile` has `create_date`, `write_date`, and debit/credit
  journal-item links. It has no noninternal database trigger. A deleted row
  cannot be discovered by polling its `write_date`.
- The installed `auditlog` module has subscribed full create/write/unlink rules
  for `account.move.line`, `account.move` and `account.payment`. These rules have
  no configured user filters, excluded users or excluded fields. No rule for
  `account.partial.reconcile` was found. `capture_record` is false on these rules.
- A bounded sample of 500 recent journal-item audit entries showed logged field
  names including `matched_debit_ids`, `matched_credit_ids`, `amount_residual`,
  `amount_residual_currency`, `full_reconcile_id` and `reconciled`. Only field-name
  observation counts were returned; no old/new values were read or printed.
- The audit cleanup cron is disabled; its configured invocation is
  `autovacuum(180)`. This is current configuration, not proof of uninterrupted
  audit retention or an approved retention guarantee.
- `customer_payment_fifo_reconcile` is installed. Its Python implementation and
  deletion behavior have not been inspected. Database metadata alone does not
  establish that every allocation deletion updates a parent timestamp or creates
  a usable audit event, nor does it establish old/new audit-value serialization.

Implementation must not assume a direct allocation deletion stream. Parent audit
events are an available dependency-discovery input, subject to verifying their
encoding and coverage. Previously retained dependency links and explicit presence
checks remain necessary for deleted outputs; audit gaps must not advance a cursor
under a claim of complete discovery. No new audit rule, source trigger or CDC
configuration was installed.

### Follow-up: parent audit events are not a complete allocation change feed

A second bounded schema-shape inspection returned only `create` audit entries
for matched allocation fields in the sampled journal-item logs. Raw new values
were numeric-ID list strings; old values were null. This does not verify write
or unlink coverage, or old-value encoding on those operations.

The upstream [Odoo 18 partial reconciliation implementation](https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_partial_reconcile.py)
calls `_update_matching_number` during reconciliation and unreconciliation. That
method uses direct SQL updates for journal items in its graph. The upstream
[OCA 18 auditlog implementation](https://github.com/OCA/server-tools/blob/18.0/auditlog/models/rule.py)
wraps ORM create/write/unlink methods. Therefore journal-item audit rules alone
must not be treated as evidence that every allocation removal is discoverable.
These are upstream implementation references; the custom installed module's
code remains unverified.

No parent-audit adapter was added to the dependency reader. The owner has been
asked to choose between configuring the existing auditlog module for full
`account.partial.reconcile` create/write/unlink capture (including deleted-record
fields and no exclusions), or retaining a separate bounded presence sweep for
previously recorded allocation identities. Neither source configuration nor a
new deletion policy has been applied. Audit retention/coverage still needs an
explicit boundary if audit logs are used for an authoritative watermark.

### Owner decision and allocation-only sweep draft

The owner chose to keep Odoo unchanged and use a separate deletion sweep. No audit
integration is being introduced. `analytics sweep --tenant ID --mode allocations`
now routes through the existing sweep application/store lifecycle with explicit
`sweepScope: 'allocations'`. This is an implementation reference, not a company
run recommendation; the draft has not been tested or built.

The reader pages through `analytics_receivable_dependencies` allocation identities
in the exact tenant/source/definition/mapping namespace and checks their presence
in the existing read-only source snapshot, restricted to configured companies.
Each page has at most 1,000 IDs. It retains only aggregate sweep evidence in run
details, not source IDs or allocation values. Missing rows use their retained
effective dates to reconstruct existing receivable cutoffs at or after the earliest
affected date. If no row is missing, the allocation-only path does not read or
prepare snapshots. A missing retained date stops the operation with an explicit
recovery error; it does not silently select all historical periods.

Changes then use the existing exact source reconciliation, impact calculation,
prepared-data publication and transaction rollback. A sweep never commits the
incremental discovery cursor. Ordinary `sweep`, daily reconciliation and normal
sync retain their prior roles; no timer or default mode changed. Missing identities
are not removed from discovery metadata, so later explicit sweeps check them again.

Coverage is deliberately `recorded-identities-only`. Lazy discovery metadata is
not a complete historical allocation inventory. This does not bootstrap that
inventory or claim deletion coverage for allocations never recorded. The draft
repairs supported operational receivable snapshots; it does not yet replace
Business `command_allocation` outputs. Business source discovery, lineage proof
and publication integration remain unfinished.

## Basis

The pipeline follows established watermark discovery and incremental merge,
without introducing another orchestration platform:

- [Microsoft: incremental loading using old/new watermarks](https://learn.microsoft.com/en-us/azure/data-factory/tutorial-incremental-copy-overview).
- [dbt: retain built tables and merge selected new/updated records](https://docs.getdbt.com/docs/build/incremental-models).
- [PostgreSQL: transaction-bound cursors and bounded fetches](https://www.postgresql.org/docs/current/sql-declare.html).

Timestamp polling still cannot guarantee hard-delete detection or discover source
changes that do not update the governed timestamps. Existing sweep controls remain
separate. No CDC, source DDL or silent history rebuild is introduced.
