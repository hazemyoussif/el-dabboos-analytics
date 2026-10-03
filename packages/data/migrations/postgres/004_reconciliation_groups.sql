ALTER TABLE mart.reconciliation_evidence
  ADD COLUMN group_completeness boolean NOT NULL,
  ADD COLUMN missing_groups text[] NOT NULL,
  ADD COLUMN unexpected_groups text[] NOT NULL,
  ADD CONSTRAINT passing_evidence_complete CHECK (status <> 'passed' OR group_completeness);
