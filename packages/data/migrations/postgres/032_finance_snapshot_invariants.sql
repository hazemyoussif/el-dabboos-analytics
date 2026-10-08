-- A month-end publication cannot manufacture daily snapshots or change signed aging identities.
ALTER TABLE mart.finance_snapshot_evidence ADD CONSTRAINT finance_month_end
 CHECK(snapshot_date=(date_trunc('month',snapshot_date)+interval '1 month'-interval '1 day')::date AND snapshot_date<=(source_cutoff AT TIME ZONE 'Asia/Baghdad')::date);
ALTER TABLE mart.finance_snapshot_customers ADD CONSTRAINT finance_closed_buckets CHECK(
 (actual_values->>'net_aged_receivable')::numeric IS NOT NULL
 AND (actual_values->>'net_aged_receivable')::numeric=(actual_values->>'aged_at_date')::numeric+(actual_values->>'aged_1_30')::numeric+(actual_values->>'aged_31_60')::numeric+(actual_values->>'aged_61_90')::numeric+(actual_values->>'aged_91_120')::numeric+(actual_values->>'aged_over_120')::numeric
 AND (actual_values->>'net_aged_receivable')::numeric=(actual_values->>'gross_open_receivable_components')::numeric+(actual_values->>'credit_balances')::numeric
 AND (actual_values->>'total_overdue_receivable')::numeric=(actual_values->>'net_aged_receivable')::numeric-(actual_values->>'aged_at_date')::numeric
);
CREATE FUNCTION mart.finance_values_valid(values_json jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT count(*)=10 AND bool_and(key=ANY(ARRAY['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','gross_open_receivable_components','credit_balances']) AND value ~ '^-?[0-9]+\.[0-9]{6}$') FROM jsonb_each_text(values_json)
$$;
ALTER TABLE mart.finance_snapshot_customers ADD CONSTRAINT finance_complete_values CHECK(mart.finance_values_valid(actual_values));
REVOKE ALL ON FUNCTION mart.finance_values_valid(jsonb) FROM PUBLIC;
