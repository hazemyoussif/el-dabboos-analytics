# ADR-001: DashboardSpec instead of generated application code

Status: Accepted

Context: Natural-language dashboards need safe, repeatable rendering.

Decision: A planner returns only a validated DashboardSpec or DashboardPatch. The application owns queries and rendering.

Alternatives: Generate React/SQL/chart code from prompts.

Consequences: A fixed widget vocabulary limits flexibility initially, but plans are inspectable, portable, and testable.
