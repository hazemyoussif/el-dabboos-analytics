# Products & Warehouses company release — 25 October 2026

Application revision: `2316d6677a8d4c7432a97fb7c4ea4303e8029faf`, pushed on
`codex/products-warehouses`, deployed independently at
`https://46.225.43.242/reports/products-warehouses`. No merge or GitHub CI ran.

## Verification

- Frozen install and all required local static/build gates passed. Final full unit
  suite: 1,006 passed, zero failures/skips. Focused regression suite: 10 passed.
- Disposable PostgreSQL 18.6 suite: 451 passed, zero failures/skips before the
  default-date correction; domain/data, dependencies and migrations did not change
  afterwards. The disposable test database/container was removed.
- Initial synthetic browser evidence is recorded in the offline handoff. Final
  company verification used the existing authenticated browser session and the
  restricted runtime publication reader, without accessing Odoo.
- The first deployment exposed a date-default defect: today was outside the
  published period. The final revision chooses a published default cutoff, while
  preserving explicitly selected sales dates and all access/filter restrictions.
- The authenticated final page rendered all six canonical tables, with 100 real
  values loaded per table, 415 inventory products and 320 invoice products in the
  result-window counts. Default sales dates were 1–15 October 2026.
- Main-warehouse selection reduced all four inventory tables to 375 products;
  both sales tables remained at 320 products. Reset restored the report defaults.
- Visible provenance: inventory snapshot/business data through 15 October;
  invoice business data through 14 October; source observed 15 October at 13:52
  in the tenant display. These are the existing published readings, distinct from
  the later saved-sync observation recorded by the Sales Command Center session.

Existing output retains partial/unproven coverage notices and pending Finance
review. This verifies real published reads, not full source reconciliation or the
new sold/unsold, actual-tag/current-owner, reserved/free-stock or valuation features.
Those remain explicitly pending; no substitute metrics or synthetic rows are used.
Manual Excel download and full keyboard traversal remain unconfirmed.

## Deployment and recovery evidence

API image: `sha256:4b6eeee27e812248202c2caab05596aff9b39e08f159439ca302bbcb0d1d96ca`.
Web image: `sha256:5da9f683c92107b2844c5c3575946c78fa8d0c3c3faef085705fdd310a8bb1d0`.
Both use the full application revision as their image tag and OCI revision label.
Build number: 343. Readiness returned persistence and analytics available.

The verified local artifacts were promoted over the exact existing dependency
bases (API `298f1e3`, web `6caf30e`). Dependency manifests, frozen lockfile, schema,
domain/data packages and protected runtime configuration were unchanged. Artifact
archive SHA-256: `82a80b24ef3cced0393b18caf47cff848973403b9616aeb3c00f27385db68c79`.
The package, per-file checksums, Dockerfiles, guarded deploy/rollback script, Git
bundle and deployment log are on the existing external volume under
`el-dabboos-releases/products-warehouses-2316d66`.

Promotion checked a clean exact previous checkout/image pair and inactive timers,
then acquired the existing ordinary/background locks. No source extraction, sync,
preparation, publication, migration, secret replacement or database write job ran.
Sync, daily and Command-background timers remained inactive after deployment.
The prior `32cfb7b` application images and original baseline images remain for
rollback under the same maintenance locks. Database rollback is unnecessary for
this application-only release. Root storage after promotion: 2.8 GiB available;
external release/backup volume: 24 GiB available. Preserve these rollback images
and avoid a full dependency rebuild without a storage preflight.
