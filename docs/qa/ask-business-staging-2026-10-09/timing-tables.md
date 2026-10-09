### Scalar: net invoiced revenue in September

| Stage (ms unless noted) | Before | After profile restore |
| --- | ---: | ---: |
| Context construction + schema/provider request preparation | 61.669 | 15.477 |
| Bonsai planner | 58514.830 | 20498.113 |
| Planner retries (count) | 0.000 | 0.000 |
| Analytics execution | 68.001 | 16.650 |
| Synthesis | 0.000 | 0.000 |
| Persistence/audit transaction | 7.995 | 5.648 |
| HTTP total | 58662.331 | 20576.717 |
| Output tokens (count) | 1744.000 | 594.000 |

Outcome before / after: `SUPPORTED` / `SUPPORTED`.

### Ranking: highest order revenue in September

| Stage (ms unless noted) | Before | After profile restore |
| --- | ---: | ---: |
| Context construction + schema/provider request preparation | 1.464 | 2.097 |
| Bonsai planner | 68597.916 | 20101.537 |
| Planner retries (count) | 0.000 | 0.000 |
| Analytics execution | 0.000 | 0.000 |
| Synthesis | 0.000 | 0.000 |
| Persistence/audit transaction | 8.365 | 8.348 |
| HTTP total | 68661.156 | 20142.135 |
| Output tokens (count) | 2048.000 | 561.000 |

Outcome before / after: `INVALID_PLAN` / `AMBIGUOUS`.

### Follow-up: second place after the unresolved ranking

| Stage (ms unless noted) | Before | After profile restore |
| --- | ---: | ---: |
| Context construction + schema/provider request preparation | 1.849 | 1.407 |
| Bonsai planner | 47090.139 | 19163.590 |
| Planner retries (count) | 0.000 | 0.000 |
| Analytics execution | 14.819 | 11.264 |
| Synthesis | 0.000 | 0.000 |
| Persistence/audit transaction | 5.746 | 9.854 |
| HTTP total | 47158.126 | 19236.290 |
| Output tokens (count) | 1396.000 | 542.000 |

Outcome before / after: `SUPPORTED` / `SUPPORTED`.
