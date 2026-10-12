-- Historical publication must validate current certified evidence, not frozen business values.
-- September values can legitimately change when Odoo records are corrected after certification.
CREATE OR REPLACE FUNCTION mart.guard_historical_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF length(btrim(NEW.approval_reference))=0 OR NOT EXISTS(
  SELECT 1 FROM mart.serving_bindings
  WHERE tenant_id=NEW.tenant_id AND dataset_id=NEW.anchor_dataset_id
 )
 OR (SELECT count(*) FROM mart.historical_release_members
     WHERE tenant_id=NEW.tenant_id AND reference=NEW.reference)
    <>(SELECT count(*)*2 FROM generate_series(NEW.period_from,NEW.period_to,interval '1 month'))
 OR EXISTS(
  SELECT 1
  FROM generate_series(NEW.period_from,NEW.period_to,interval '1 month') month_start
  CROSS JOIN (VALUES('events'),('aging')) kinds(kind)
  LEFT JOIN mart.historical_release_members member
    ON member.tenant_id=NEW.tenant_id
   AND member.reference=NEW.reference
   AND member.period_from=month_start::date
   AND member.kind=kinds.kind
  WHERE member.dataset_id IS NULL
 ) THEN
  RAISE EXCEPTION 'Historical serving requires complete event and snapshot months and the preserved anchor';
 END IF;

 IF EXISTS(
  SELECT 1
  FROM mart.historical_release_members member
  JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id)
  WHERE member.tenant_id=NEW.tenant_id
    AND member.reference=NEW.reference
    AND (
      NOT mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
      OR NOT mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids)
    )
 ) THEN
  RAISE EXCEPTION 'Historical binding requires all monthly proofs still valid';
 END IF;

 RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION mart.guard_historical_binding() FROM PUBLIC;
