# Trusted event daily bases and monthly range planning

The immutable operational manifest remains serving authority. Migration 034 adds
`analytics_monthly_bases` and `analytics_aggregate_proofs`; daily bases reuse
`analytics_aggregate_bases`, keyed by tenant, partition, measure, business date and
full dimension tuple. Full tuples retain Customer, Business Line, Salesperson and
policy intersections without storing rendered reports. Values are `numeric(30,6)`
and counts are additive. Canonical fact revisions remain authoritative.

A monthly row is the exact sum of daily event bases for one measure/tuple, with
its observed data-through date. Snapshots never enter this table. Ratios divide
summed numerator and denominator bases after range selection; zero denominators
remain null. Distinct-count metrics retain stable identities across tuples.

A partition proof records immutable definition/mapping versions and business
timezone, counts and reconciliation time. Its INSERT guard compares canonical
active event heads against daily values/counts, then daily against monthly values,
counts and observed dates with bidirectional EXCEPT. It detects missing and extra
identities, including empty partitions. Appending to either grain after proof is
forbidden. Deferred promotion requires proof for affected partitions alongside
existing exact source/mart evidence. Failure rolls back heads, aggregates, pointer
and cursor; immutable failed source comparisons keep their established lifecycle.

## Incremental refresh

The store retains old/new canonical changes and passes their business dates to
aggregate refresh. Existing months copy unchanged daily rows, recompute changed
days (all tuples, including old/new dimensions), and rebuild the affected monthly
rollup. New months get a complete canonical seed. Date moves refresh both months;
tombstones remove the old day footprint. Dependent months without changed facts
retain their daily values and receive a new reconciled rollup. Canonical proof
checks still scan the affected month's event facts; they never rebuild full history.
The scheduler invokes the existing AnalyticsOperations transaction and needs no
grain-specific command.

## Selection and compatibility

`planTrustedRange` exposes deterministic operator/test decisions. Query slots
encode visual grain independently of the filter. For each covered slot/month it
selects monthly only when the entire calendar month is included and its exact
partition proof matches the current immutable baseline definition, mapping and
business timezone. Partial edges use daily. A full-month filter with day output
has one slot per day and cannot select a monthly scalar. Twelve complete months
select twelve monthly references; mixed ranges select daily edges and monthly
middle. Measures, dimension tuples and both viewer/policy filters are applied to
both grains. Contributions, rankings, Top-N, running totals and governed moving
averages operate after selected-period aggregation.

Unchanged partitions inherited through the trusted manifest may come from older
physical refreshes. Their partition identity and frozen proof bind them to the
same baseline semantics; this is legitimate hybrid revision lineage, not arbitrary
mixing of releases. Reads pin the manifest in a repeatable-read transaction. There
is no global result cache. Existing execution dedup remains request-scoped.

Missing/incompatible monthly proof falls back to the manifest's trusted daily
base, including legacy partitions awaiting backfill. Missing daily coverage keeps
the existing DATA_NOT_READY/PARTIAL_COVERAGE behavior. Operational runtime has no
canonical-head read grant, so no raw operational fallback is permitted there.
Existing independently certified repository fallback remains available when no
operational manifest exists. No untrusted aggregate is selected.

Receivables uses its existing Finance snapshot adapter: latest trusted cutoff at
or before the selected end, never event summation. Finance semantics and serving
storage are unchanged.

## Operator workflow

Use protected local configuration and explicit tenant:

```bash
pnpm event:aggregates backfill --tenant el-dabboos-iq
pnpm event:aggregates plan --tenant el-dabboos-iq 2026-04-17 2026-07-12
pnpm event:aggregates verify --tenant el-dabboos-iq 2025-10-01 2026-09-30
pnpm analytics status --tenant el-dabboos-iq
```

Backfill applies immutable migrations, then commits one current trusted month per
transaction under the existing tenant writer lock. Proof creation is atomic with
monthly rows. A restart resumes missing proofs; completed immutable proofs are
recognized without rebuilding. The current manifest is re-resolved per month so
a concurrent operational promotion cannot attach evidence to stale heads. It
never advances the source cursor or changes the trusted pointer/certification.
It includes current October if that month is already trusted.

After migrations, non-inheriting staging logins require the existing
`grantStagingPrivileges` copier for martRuntime and martIngestor. It copies reviewed
table grants and adds runtime to restrictive trusted policies; never change role
inheritance or bypass RLS. Normal inherited runtime roles receive migration grants.
`analytics status` adds proof coverage/counts, pending partitions, compatible
monthly partitions and latest refresh. Existing failed runs/failures retain
failure visibility; rolled-back candidate partitions are not reported as trusted.
Technical range plans stay in operator tools, outside management UI.

The approved source mappings already declare `date` for the event families, but
the historical capability projection previously certified only `month`. Once all
current manifest partitions have matching daily proofs, the runtime adds `date`
only to existing event metrics whose approved mapping explicitly allows it and
whose historical capability already allows month. It adds no policy dimension,
metric definition or analysis permission. Missing/incompatible proof removes this
new daily-output projection; existing summaries/monthly reads retain daily
fallback. Historical certifications and stored baseline capabilities are untouched.

Partition availability dates also bound operator plans. A proved October rollup
can contain the current partial month, but its available-through date forces
daily selection and excludes future days. Proof existence alone never turns
that partial rollup into a complete-month representation. Status monthly counts
refer to compatible persisted rollups, including the current partial month.
