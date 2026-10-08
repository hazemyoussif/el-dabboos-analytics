-- Freeze membership as well as row contents. Publication and customer insertion share
-- the evidence-row lock, so concurrent insertions cannot change a published snapshot.
CREATE FUNCTION mart.lock_finance_snapshot_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM mart.finance_snapshot_evidence WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id FOR UPDATE;
 IF TG_TABLE_NAME='finance_snapshot_customers' AND EXISTS(SELECT 1 FROM mart.finance_snapshot_publications WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id) THEN
  RAISE EXCEPTION 'Published Finance snapshot membership is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_00_membership_lock BEFORE INSERT ON mart.finance_snapshot_customers FOR EACH ROW EXECUTE FUNCTION mart.lock_finance_snapshot_membership();
CREATE TRIGGER finance_00_membership_lock BEFORE INSERT ON mart.finance_snapshot_publications FOR EACH ROW EXECUTE FUNCTION mart.lock_finance_snapshot_membership();
REVOKE ALL ON FUNCTION mart.lock_finance_snapshot_membership() FROM PUBLIC;
CREATE OR REPLACE FUNCTION mart.finance_values_valid(values_json jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT count(*)=10 AND bool_and(key=ANY(ARRAY['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','gross_open_receivable_components','credit_balances']) AND value IS NOT NULL AND value ~ '^-?[0-9]+\.[0-9]{6}$') FROM jsonb_each_text(values_json)
$$;
