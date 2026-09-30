# ADR-011: Deterministic calendar comparison alignment

Status: Accepted

Context: Shifting JavaScript dates by setting a month can overflow at month end. Matching grouped results by their current key incorrectly compared each month or quarter to a whole previous range.

Decision: All date arithmetic uses UTC calendar dates. Month and year shifts clamp days in shorter months; a full month-end range remains a full calendar month. For grouped time comparisons, each current date, month, quarter, or year is paired with its corresponding prior calendar bucket. Previous-period comparisons shift by one bucket when grouped, and by the inclusive range length otherwise. Moving averages operate on ordered grouped results; when combined with a comparison, both current and baseline series are smoothed before change is recomputed.

Alternatives: JavaScript `setUTCMonth` on arbitrary dates; one prior aggregate reused for all groups; timestamp-duration approximations for months.

Consequences: Partial current buckets may be compared with complete prior calendar buckets; the UI should identify partial periods when added. Leap-day and quarter-boundary behavior is covered by tests.
