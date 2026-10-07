# ADR 022: Controlled web presentation themes

## Decision

Presentation belongs to apps/web. Semantic CSS tokens define the restrained teal/slate identity and Light/Dark surfaces, text, borders, semantic feedback, focus, spacing, typography and elevation. styles.css is an import entry; tokens, base, shell, dashboard, charts, builder and library files own their respective presentation. React composition, feature hooks and governed visualization contracts retain their responsibilities. Lucide provides tree-shaken UI icons.

ThemeProvider resolves System (default), Light and Dark, writes data-theme on the document root and follows prefers-color-scheme changes in System mode. The localStorage key el-dabboos.ui-theme is independent of el-dabboos.ui-locale. Sidebar collapse uses el-dabboos.sidebar-collapsed. None enters DashboardSpec, DashboardRecord or API requests. Switching theme only rerenders presentation; it cannot execute analytics, save, increment a record version or dirty a working draft. Preferences gracefully fall back when storage is unavailable.

WidgetPresentation may store a governed palette name as explicit chart intent; global theme preference remains separate. The web resolver maps the finite palette names to Light/Dark colors centrally; actual colors never enter the spec. A missing widget palette inherits the optional dashboard palette; without either token it resolves to Enterprise. An explicit widget default always selects Enterprise. Named palettes have bounded wraparound and retain comparison, tooltip and accessible-table conventions.

ChartTheme centrally supplies separate eight-color categorical palettes and six-step sequential ramps, semantic colors, axes, grid, tooltip and highlight colors. Series order determines colors with bounded palette wraparound. Composition charts use retained category order/source indices so marks, tooltip markers and legends agree. Comparison lines use the corresponding series color with reduced opacity and a dashed stroke. Shared axes, legends and enterprise tooltips preserve formatted comparison/change/rank metadata. Compact chart labels never replace precise tenant-aware tooltip values or accessible chart tables. Missing values remain missing; no synthetic trends or sparkline data are introduced.

Desktop navigation is 280px expanded / 72px collapsed, with a separately scrolling library/template entry and reachable header/footer. Tablet navigation defaults to collapsed with an explicit expansion override. Mobile uses a native modal dialog, keyboard focus wrapping, Escape dismissal and dismissal after dashboard/template navigation. Expanded/collapsed modes retain labels/tooltips and all dashboard actions. Full template search and category filtering live in the creation flow.

Feedback uses semantic tokens plus icons/text/ARIA, not color alone. Drag targets preserve a solid/dashed distinction. Charts disable decorative animation; CSS honors reduced-motion. Inter and Noto Sans Arabic retain separate RTL typography rules. Existing custom grid geometry and accessibility value tables remain intact.

## Future branding boundary

A future tenant branding configuration may supply validated, controlled token values (brand primary, accent and logo). It must preserve accessible foreground/background pairs and deterministic chart assignment. It must not accept arbitrary CSS, change analytics/spec semantics, or embed theme colors into persisted dashboard content. Tenant branding is not implemented in this decision.

## Tradeoffs

The chart bundle remains substantial; Lucide tree shaking adds a small increment without a component framework. Native selects/details retain their keyboard semantics beneath the visual styling. Very large category sets repeat the bounded palette and retain labels/legends; no categories are silently dropped. Desktop grid sizing remains authoritative, so intentional space between differently sized widgets can remain.

Brand assets and backward-compatible browser preference migration are documented in [branding](../../developer/branding.md).

## AI/manual palette convergence

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content. Explicit Default persists as the governed default token; absent widget intent inherits dashboard appearance, or resolves to Enterprise when dashboard appearance is also absent. Palette changes are presentation-only history entries and require explicit Save, unlike global UI theme changes.

Dashboard Appearance V1 persists only the governed dashboard palette in optional DashboardSpec v2 presentation, through the normal explicit Save/version lifecycle. It is separate from personal theme preferences. See [visualization capabilities](../visualization-capabilities.md#dashboard-appearance-v1) for inheritance and canonical patch rules.

October 7 runtime follow-up: metric hints use one shared portal in the application
overlay root, positioned against the trigger and clamped/flipped to the viewport.
Cards retain their content clipping. The full definition action remains a native
dialog. Report destination comes from browser history independently of loaded
analytics; header logout uses existing shell button tokens and Lucide icons.
Shared dimension filters use governed display evidence with stable identity values;
missing/conflicting evidence uses the neutral “—” presentation fallback and
Unassigned remains localized. Appearance/responsive/browser accessibility checks
remain pending in the combined Luna handoff; no visual pass is implied.
