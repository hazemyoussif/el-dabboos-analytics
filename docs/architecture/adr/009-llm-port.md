# ADR-009: LLM provider abstraction

Status: Accepted

Context: Local llama.cpp/Bonsai and Muse Spark need comparable evaluation.

Decision: DashboardPlanner depends on an LLMProvider port, never a vendor SDK. Provider adapters share evaluation cases.

Alternatives: Couple planning to the first local model.

Consequences: Provider-specific telemetry is optional; correctness rules remain provider-neutral.
