-- The migrator is NOBYPASSRLS. A tenant-free migration must inspect every
-- tenant before trusting the insertion-time identity proof installed in 082.
-- These owner-only read policies exist solely within this migration transaction.
LOCK TABLE mart.analytics_sync_heads, mart.analytics_sync_seals IN SHARE ROW EXCLUSIVE MODE;
CREATE POLICY sync_upgrade_scan ON mart.analytics_sync_heads FOR SELECT TO dabboos_migrator USING(true);
CREATE POLICY sync_upgrade_scan ON mart.analytics_sync_seals FOR SELECT TO dabboos_migrator USING(true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_sync_heads head WHERE NOT EXISTS(
  SELECT 1 FROM mart.analytics_sync_seals seal WHERE seal.tenant_id=head.tenant_id AND seal.candidate_id=head.candidate_id)) THEN
  RAISE EXCEPTION 'Unsealed sync heads must be resolved before installing identity validation';
 END IF;
END $$;
DROP POLICY sync_upgrade_scan ON mart.analytics_sync_seals;
DROP POLICY sync_upgrade_scan ON mart.analytics_sync_heads;
