# ADR 022: Controlled web presentation themes

## Decision

Presentation belongs to apps/web. Semantic CSS tokens define the restrained teal/slate identity and Light/Dark surfaces, text, borders, semantic feedback, focus, spacing, typography and elevation. styles.css is an import entry; tokens, base, shell, dashboard, charts, builder and library files own their respective presentation. React composition, feature hooks and governed visualization contracts retain their responsibilities. Lucide provides tree-shaken UI icons.

ThemeProvider resolves System (default), Light and Dark, writes data-theme on the document root and follows prefers-color-scheme changes in System mode. The localStorage key el-dabboos.ui-theme is independent of el-dabboos.ui-locale. Sidebar collapse uses el-dabboos.sidebar-collapsed. None enters DashboardSpec, DashboardRecord or API requests. Switching theme only rerenders presentation; it cannot execute analytics, save, increment a record version or dirty a working draft. Preferences gracefully fall back when storage is unavailable.

WidgetPresentation may store a governed palette name as explicit chart intent; global theme preference remains separate. The web resolver maps the finite palette names to Light/Dark colors centrally; actual colors never enter the spec. No palette token preserves the existing default. Named palettes have bounded wraparound and retain comparison, tooltip and accessible-table conventions.

ChartTheme centrally supplies separate eight-color categorical and sequential palettes, semantic colors, axes, grid, tooltip and highlight colors. Series order determines colors with bounded palette wraparound. Composition charts use retained category order/source indices so marks, tooltip markers and legends agree. Comparison lines use the corresponding series color with reduced opacity and a dashed stroke. Shared axes, legends and enterprise tooltips preserve formatted comparison/change/rank metadata. Compact chart labels never replace precise tenant-aware tooltip values or accessible chart tables. Missing values remain missing; no synthetic trends or sparkline data are introduced.

Desktop navigation is 280px expanded / 72px collapsed, with a separately scrolling library/template entry and reachable header/footer. Tablet navigation defaults to collapsed with an explicit expansion override. Mobile uses a native modal dialog, keyboard focus wrapping, Escape dismissal and dismissal after dashboard/template navigation. Expanded/collapsed modes retain labels/tooltips and all dashboard actions. Full template search and category filtering live in the creation flow.

Feedback uses semantic tokens plus icons/text/ARIA, not color alone. Drag targets preserve a solid/dashed distinction. Charts disable decorative animation; CSS honors reduced-motion. Inter and Noto Sans Arabic retain separate RTL typography rules. Existing custom grid geometry and accessibility value tables remain intact.

## Future branding boundary

A future tenant branding configuration may supply validated, controlled token values (brand primary, accent and logo). It must preserve accessible foreground/background pairs and deterministic chart assignment. It must not accept arbitrary CSS, change analytics/spec semantics, or embed theme colors into persisted dashboard content. Tenant branding is not implemented in this decision.

## Tradeoffs

The chart bundle remains substantial; Lucide tree shaking adds a small increment without a component framework. Native selects/details retain their keyboard semantics beneath the visual styling. Very large category sets repeat the bounded palette and retain labels/legends; no categories are silently dropped. Desktop grid sizing remains authoritative, so intentional space between differently sized widgets can remain.

Brand assets and backward-compatible browser preference migration are documented in [branding](../../developer/branding.md).
