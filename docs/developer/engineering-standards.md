# Engineering standards

Green tests are necessary but not sufficient. Review production changes for descriptive naming, cohesive responsibility, useful abstractions, dependency direction, transaction clarity, readable security policy, error ownership and maintainable tests.

Use business names such as actor, membership, role, tenant, identity, permission, dataScope, dashboard, grant, transaction, request, response and writeResult. Single-letter business bindings are debt. Tiny conventional mathematical coordinates may be justified in review; do not rename unrelated historical code mechanically.

Keep operations explicit and typed. Shared infrastructure may execute transactions, resolve actors, generate IDs/timestamps and append safe audits. It must not become a generic resource/action dispatcher, command bus, universal CRUD service or dynamic form renderer. Extract a cohesive policy or responsibility, never a wrapper created only to lower a number.

Application and data depend on domain, never each other. API owns HTTP validation/session/composition and invokes named operations. Browser code calls HTTP and cannot load database adapters. Review the import graph including reexports and dynamic imports with `pnpm check:architecture`; unresolved local imports and nonliteral module loading fail.

Resolve fresh actor and target inside the write transaction. Preserve CAS, current and next delegation ceilings, recovery checks, tenant predicates and successful audit rollback. Transaction-bound repositories use the owner's connection; they must not open nested transactions. Denied/error audit stays safe and separate. Catch only errors the owning boundary can interpret; preserve unknown failures.

`pnpm check:quality` uses TypeScript AST counts: complexity ceiling 15, owned statements 60, parameters 5, file statements 400 and zero single-letter bindings. Function metrics exclude nested functions; file density includes their statements. These are review triggers, not substitutes for engineering judgment. Baseline entries contain file, declaration ownership path, metric and ceiling. Anonymous callbacks additionally use a normalized-source digest. Formatting/line movement does not key debt to line numbers.

Historical debt comes only from `fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368`. Existing symbols cannot exceed their recorded ceiling. New code has no allowance. Remove resolved entries; baseline growth or changed thresholds require explicit review. Never baseline the access-control feature or suppress its findings. The baseline generator is an auditable historical reconstruction tool, not a command to accept current debt.

`pnpm check:diff` checks whitespace and forbidden changed credential-file names. It complements human secret review; it is not a secret detector. Guardrail fixture tests run with the normal suite. Before push run frozen install, lint, architecture, quality, typecheck, all tests, disposable synthetic PostgreSQL tests, build and diff. Report exact counts/skips and CI at the final SHA. Never merge without authorization.

Characterize uncovered ordering, DTOs, rollback, recovery, concurrent CAS, request serialization, expectedVersion and async ownership before risky decomposition. Preserve strong security assertions. Keep fixtures synthetic and independent of developer environment/model services. Manual browser, bilingual, theme, responsive and accessibility evidence is distinct from unit/SSR evidence.
