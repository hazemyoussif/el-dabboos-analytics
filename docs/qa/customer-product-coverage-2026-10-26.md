# Customer product coverage — 26 October 2026

Status: release candidate locally verified; company rollout/publication pending.

The owner confirmed forecasted quantity greater than zero and per-customer status.
The exact report is separate from Sales Command Center. Existing dirty work was
preserved using a named Git stash before integrating all verified API commits
through 4938035; no main merge or GitHub Actions were invoked. Report migrations
were renumbered to 097–101 after the already-deployed API migrations 095/096.
The API adapter's source receipt/cursor fixes and completed company updates remain.

## Evidence so far

- Focused combined preparation/source/security/historical tests: 11 passed, no skips.
- Every-metric PostgreSQL parity: 130 passed, no skips; release capabilities remain
  bounded at 128, with the test catalog exercised across separate bounded releases.
- Unit/API/UI full run: 1,035 passed, zero failures/skips; subsequent projection/API
  endpoint regression additions passed separately (6 targeted tests).
- Frozen install, lint, architecture, typecheck, build and engineering quality
  passed at the earlier checkpoint. Final full PostgreSQL run is in progress.
- Company-only metadata preflight confirmed all new stock and attribution fields
  through standard Odoo API. Ten product costs were returned as resolved numeric
  values, no missing costs; no customer extracts or credentials were returned.
- Existing company input size approximately 2 GB; measured secondary free space
  approximately 13 GB, root 7 GB. No accepted data or recovery artifacts deleted.
- Previous synthetic browser interaction evidence covers All/Sold/Unsold (120/40/80),
  paging 100 then 20, current owner (60), actual tag (60), calendar year, Arabic,
  and filter preservation across language switches. Phone 390px and desktop 1280px
  screenshots inspected; intentional table scroll, no page overflow. Final AFTER
  locale/theme/viewport recheck and company acceptance remain pending.

Full local logs are ignored under .local-state/inventory-availability/final-*.log.
Never interpret an incomplete run or source capture as company publication success.

## App restart checkpoint

The company account's approval checks now work. Browser access still returns
"Local browser use is disabled in Work settings", including after a tool reset
and an attempt to access the user's authenticated staging tab. The user proposes
restarting the app so it picks up the changed browser setting. No browser login,
session permission or certificate validation was bypassed.

All report work remains in the existing worktree; the named recovery stash is
retained. Integrated HEAD is 155f0a1, with unpublished report changes on top.
No new company migration, input capture or report deployment has been performed.
The current broad synthetic PostgreSQL run writes final-postgres.log; inspect
completion and errors after restart instead of assuming success. Final static
checks reached a test-only exact-optional-property type error, now fixed; rerun
typecheck/build/diff. Later projection, API endpoint and provenance additions need
final regression verification. Root/data-disk sizes were measured without deletion.
All three company timers were active. Their configuration and accepted data were
left unchanged. Resume final checks, compatible new API input, only new recipe
publication, deployment and actual EN/AR browser acceptance after restart.

## Final local release verification

The post-restart exact code passed 1,036 unit/API/web tests and 476 PostgreSQL
tests with zero failures, cancellations or skips. Frozen install, lint,
architecture, quality, typecheck, API/web build and diff passed. Existing bundle
size warning remains. No GitHub CI was run. The report release commit will pin this
code; company data acceptance remains separate.

The dashboard quality skill AFTER review was repeated through the actual browser:
English and Arabic, Light and Dark, each at 390/1024/1280 px (12 inspected states).
No page-level horizontal overflow; the 390px table retains inner horizontal scroll.
Status filtering returned 40 sold and 80 unsold from 120 synthetic pairs; paging
returned 100 then 20 rows. Actual tag and current governorate filters each returned
60 matches without duplicates. Customer selection exercised the honest zero-match
state. Tag selection and results survived EN/AR switching. Native mobile navigation
opened, changed theme and closed with Escape. Focus was visible in both themes.
No material UI finding remains in the implemented section. These are synthetic
manual checks, not company source or deployment acceptance.

Browser access was restored after the app restart. The signed-in company staging
page can now be read. Keep browser session permissions intact during acceptance.
