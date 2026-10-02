# Editable architecture diagrams

Current unless explicitly marked proposed/future. These C4-style context/container views use standard Mermaid flowcharts. Runtime arrows are distinct from compile-time imports.

## 1. C4 system context

```mermaid
flowchart LR
 U[User] --> W[Analytics web]
 W --> A[Fastify API]
 A --> M[Optional configured model endpoint]
 A -. future identity .-> I[Future IdP]
 O[Operational source] -. proposed transform .-> P[Future PostgreSQL analytics source]
 A -. future adapter .-> P
```

## 2. C4 containers

```mermaid
flowchart TB
 W[React web] --> F[Fastify API]
 F --> A[Application use cases]
 A --> D[Domain ports and contracts]
 F --> X[Data adapters]
 X --> S[Analytics DB or source]
 X --> B[Dashboard metadata DB]
 F --> L[Optional model endpoint]
```

## 3. Compile-time package dependencies

```mermaid
flowchart LR
 W[apps/web] --> D[packages/domain]
 W -->|types and pure date preset| A[packages/application]
 F[apps/api] --> A[packages/application]
 F --> X[packages/data]
 F --> D
 A --> D
 X --> D
```

## 4. Dashboard execution

```mermaid
flowchart LR
 S[DashboardSpec] --> V[Canonical and semantic validation]
 V --> P[Authorization]
 P --> E[DashboardExecutor]
 E --> Q[Normalized AnalyticsQuery]
 Q --> N[Request dedup and bounded scheduling]
 N --> R[AnalyticsRepository]
 R --> T[AnalyticsResult]
 T --> K[Anchor-key alignment]
 K --> U[Renderer]
```

## 5. Manual builder

```mermaid
flowchart LR
 B[Blank or current working spec] --> M[Builder action]
 M --> V[Schema semantic layout validation]
 V --> H[Undo redo draft history]
 H --> C{Semantic change}
 C -->|yes| P[Authorized analytics preview]
 C -->|layout or palette only| U[Local presentation]
 H --> S[Explicit Save only]
```

## 6. Metric drag and drop

```mermaid
flowchart LR
 P[Authorized metric palette] --> D[Drag metric ID]
 D --> T{Drop target}
 T --> C[Canvas new widget]
 T --> A[Existing widget add series]
 T --> R[Replace series]
 C --> V[Compatibility and layout validation]
 A --> V
 R --> V
 V --> H[Working draft and preview]
```

## 7. AI generation

```mermaid
flowchart LR
 C[Authorized capabilities and metadata] --> P[StructuredDashboardPlanner]
 P --> L[LLMProvider with projected schema]
 L --> J[Unknown summary or grouped generation intent]
 J --> I[Plan validation and deterministic compiler]
 I --> V[Canonical schema validation]
 V --> S[Semantic layout validation]
 S --> A[Authorization]
 A --> E[Execution preview]
 E --> D[Unsaved working draft]
 V -. bounded repair .-> P
```

## 8. AI editing

```mermaid
flowchart LR
 D[Working spec and instruction] --> P[Planner with authorized capabilities]
 P --> L[Provider projected sparse edit schema]
 L --> J[Unknown DashboardEditPlan JSON]
 J --> I[Plan validation and deterministic compiler]
 I --> V[Canonical patch validation]
 V --> N[Atomic patch application]
 N --> S[Completed spec schema and semantics]
 S --> A[Post-validation authorization]
 A --> E[Execute draft preview]
 E --> W[Working draft only]
 W --> B[Explicit Save]
```

## 9. Authentication and authorization

```mermaid
flowchart TB
 H[Current demo headers] --> I[Demo IdentityProvider]
 F[Future verified IdP principal] -. future .-> I
 I --> M[Validated tenant membership]
 M --> P[Route permissions]
 P --> D[Metric availability and domains]
 D --> Q[User filters AND enforced filters]
 Q --> R[Tenant-scoped repository]
 L[Planner output] --> V[Full canonical validation]
 V --> D
```

## 10. Saved dashboard lifecycle

```mermaid
stateDiagram-v2
 [*] --> UnsavedDraft
 UnsavedDraft --> Saved: First Save plus naming
 Saved --> DirtyDraft: Manual AI or Rename
 DirtyDraft --> Saved: Save with expectedVersion
 DirtyDraft --> Conflict: Stale version
 Conflict --> DirtyDraft: Deliberate reconcile
 DirtyDraft --> Saved: Discard
 Saved --> Saved: Save As creates separate saved record
 Saved --> Saved: Reopen accessible deep link
```

## 11. Library and folders

```mermaid
flowchart LR
 A[Accessible DashboardRecords] --> V[All Mine Shared views]
 P[Personal tenant user preferences] --> V
 P --> F[Favorites and folder views]
 V --> S[Client search and sort]
 F --> S
 C[Create rename delete flat folder] --> P
 M[Move record association] --> P
 C -. delete clears associations only .-> P
```

## 12. Theme and presentation

```mermaid
flowchart LR
 U[User Light Dark System choice] --> P[Local theme preference]
 P --> T[ThemeProvider]
 O[OS preference] --> T
 T --> C[CSS tokens and central chart palette]
 C --> R[Rendering only]
 R --> N[No analytics execution or spec Save]
```

## 13. Proposed real-data target — pending confirmation

```mermaid
flowchart TB
 O[Odoo or operational systems] --> P[Existing company Python processing]
 P --> M[Proposed canonical mart or PostgreSQL]
 M --> A[AnalyticsRepository adapter]
 A --> S[El Dabboos semantic layer]
 S --> R[Agreed report reconciliation]
 B[Business metric currency tenant approvals] -. gate .-> A
```

## 14. Proposed production request tracing — design only

```mermaid
sequenceDiagram
 participant W as Web
 participant A as API
 participant U as Application
 participant R as Repository
 participant L as Model provider
 W->>A: Request with validated correlation ID
 A->>U: requestId traceId tenant context
 U->>R: Query span and policy context
 R-->>U: Result and duration metadata
 opt Planning only
 U->>L: Approved context and provider span
 L-->>U: Unknown structured output
 end
 U-->>A: Safe outcome and failed series count
 A-->>W: Safe response and correlation ID
```
