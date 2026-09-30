# ADR-012: pnpm workspace and CI

Status: Accepted

Context: Both npm and pnpm lockfiles existed, allowing dependency resolution to drift.

Decision: Use pnpm 12.6.0, a pnpm workspace file, and one pnpm lockfile. CI installs with `--frozen-lockfile` on Node.js 24 and runs lint, typecheck, and tests.

Alternatives: Retain npm as the package manager; maintain two lockfiles.

Consequences: Local contributors and CI use the same package graph. Package manager upgrades require an intentional lockfile refresh.
