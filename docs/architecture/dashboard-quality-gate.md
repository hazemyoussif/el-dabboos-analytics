# Dashboard quality gate

This project uses a compact, project-specific UI/UX quality skill rather than the full upstream Anti-Slop ruleset.

Skill: `.agents/skills/el-dabboos-dashboard-quality/SKILL.md`

## Why

El Dabboos Analytics already has an intentional presentation architecture: semantic Light/Dark tokens, centralized chart theming, Lucide icons, bilingual/RTL support, accessible chart tables, keyboard dashboard editing, responsive navigation, and documented verification. A generic design rulebook could accidentally fight those decisions.

The local skill therefore acts as an **AFTER-mode quality gate**. It reviews completed UI work for dashboard-specific problems such as decorative KPIs, chart misuse, card overload, visual noise, inaccessible controls, weak responsive behavior, dead interactions, fabricated analytical context, and presentation drift.

It does not define a new visual style and it does not authorize changes to analytics semantics, domain rules, persistence, or authorization.

## Recommended use

After implementing a UI change, ask the agent to:

```text
Run the el-dabboos-dashboard-quality skill in AFTER mode against the UI work in this branch.
Report numbered findings by Blocker / High / Medium / Low.
Do not edit first. For every finding, identify the screen/file, the user impact, and the smallest justified fix.
```

After reviewing the findings, approve the fixes that matter. For a dedicated polish branch, the agent may then apply approved findings and run the Delivery Gate.

## Relationship to architecture

The quality gate must be read together with:

- `docs/architecture/adr/022-web-presentation-themes.md`
- `docs/architecture/enterprise-ui-verification.md`
- relevant visualization/dashboard ADRs for the feature being changed

Project architecture wins over generic aesthetic advice. In particular, Lucide is intentionally approved, controlled Light/Dark themes are intentional, and the centralized chart palette is authoritative.
