# AI architecture

`LLMProvider.generateStructured` accepts messages and a named strict JSON Schema response format. Its output has type `unknown`; the caller must apply schema and semantic validation. `DashboardPlanner` remains the domain-facing generation/editing port. Generation returns a full DashboardSpec; editing returns a DashboardPatch. The planner never asks a provider to calculate metrics or emit code, SQL, or chart configuration.

The deterministic repository and renderer work from a manually authored spec when a model is disabled. Future mock, llama.cpp, and Muse adapters must share prompt contracts and provider-neutral evaluation cases. Evaluation records schema validity, canonical metric/dimension/filter/time/analysis accuracy, unsupported metric hallucinations, edit accuracy, latency, and retries. Provider-specific cost, token, and GPU telemetry is optional.
