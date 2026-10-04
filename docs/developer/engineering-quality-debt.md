# Historical engineering debt

The baseline source is `fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368`, before access-control work. `scripts/engineering/quality-baseline.json` records the individual declaration/metric ceilings, not a file exemption. It currently contains 317 entries. Growth requires explicit review and cannot exceed the historical source. Resolved entries are removed. Access-control production code has no debt allowance.

The next workstream should prioritize existing P2 responsibility, density and naming debt in BuilderWorkspace, useWorkspace, App, PostgreSQL repository/writer, production-data validators and the edit-plan compiler. Do not infer that every baseline entry is a security defect. Green tests and metric ceilings do not replace human responsibility/error/transaction review.

This milestone extracts only the administration navigation and access-discovery additions from App/useWorkspace to prevent growth beyond their historical ceilings. The existing analytics workspace/builder logic, PostgreSQL serving/writing and production contracts are preserved. Synthetic profile validation was separated from fact generation so dynamic workspace refusal does not increase the old seed generator's ceiling.

Manual browser, English/Arabic, RTL, theme, responsive and keyboard/accessibility QA remains a separate Sol Low phase. Automated SSR and model tests are not evidence of that manual phase.
