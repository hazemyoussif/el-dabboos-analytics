# Local draft migration formatting exception — explicitly authorized and completed

The task-added, uncommitted migration 14 was applied locally before a final staged whitespace check. Its SQL ends with one extra blank line; `git diff --cached --check` rejects that line. The existing immutable-checksum runner refuses any applied file change. ADR 027 requires retaining matching migration name/SHA256 history.

Proposed one-time exception: remove **one final LF byte only**, changing no SQL statement, and update **only** version 14's checksum in the two existing laptop-local migration ledgers. Require the old checksum/name before updating; retain these hashes here as an audit record. Verify all other ledger rows and all certification/promotion history remain unchanged. No deployed/shared migration or prior Git commit contains migration 14; it is a draft created in this task. Do not weaken the migration runner or add a general amendment mechanism.

- Existing draft SHA256: `f6113135335409e352b917dad4b89d396838d4707d3ead6f46707ece160a5f4b`
- Formatted draft SHA256: `e225652a9c519534d3962b7556929f3abee014f21cf2693ed3e6368ac7019bcf`
- Bytes removed: one trailing `0a`; financial/data/schema semantics changed: zero.

The user explicitly authorized this one-time exception. Exactly one byte was removed and only version 14’s SHA256 was corrected in both existing local draft ledgers. The old/new hashes above remain the audit record. Both immutable migration runners then verified without applying changes; every other ledger row and all IQ certification/promotion/binding records were unchanged. Financial rows changed: zero. No general checksum amendment path was introduced.
