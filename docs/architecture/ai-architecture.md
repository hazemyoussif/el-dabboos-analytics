# AI architecture

`LLMProvider` is a text-completion port; `DashboardPlanner` is the domain-facing generation/editing port. Provider adapters (mock, llama.cpp, Muse Spark) must share prompt contracts and reusable evaluations. Generation returns a full spec; editing returns a patch. Both outputs must pass structural and semantic validation before execution.

Models never generate code, SQL, or executable visualization configuration. They request governed metric/dimension IDs and deterministic analytics operations. The renderer works from a manually authored spec when the model is disabled. Planned evaluation records schema validity, ID/filter/time/operation accuracy, hallucinations, edit accuracy, latency, and retries by category and provider.
