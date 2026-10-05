SET LOCAL search_path=control,pg_catalog;
CREATE FUNCTION immutable_columns() RETURNS trigger LANGUAGE plpgsql SET search_path=control,pg_catalog AS $$
DECLARE field text;
BEGIN
 FOR field IN SELECT unnest(TG_ARGV) LOOP
  IF to_jsonb(OLD)->field IS DISTINCT FROM to_jsonb(NEW)->field THEN RAISE EXCEPTION 'immutable metadata'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable record'; END $$;
CREATE TRIGGER tenants_immutable BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION immutable_columns('id','customer_id','created_at');
CREATE TRIGGER identities_immutable BEFORE UPDATE ON identities FOR EACH ROW EXECUTE FUNCTION immutable_columns('id','user_id','provider','provider_subject');
CREATE TRIGGER memberships_immutable BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION immutable_columns('id','tenant_id','user_id','created_at');
CREATE TRIGGER dashboard_immutable BEFORE UPDATE ON dashboard_records FOR EACH ROW EXECUTE FUNCTION immutable_columns('id','tenant_id','owner_user_id','created_by','created_at');
CREATE TRIGGER roles_immutable BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION immutable_columns('id','scope','tenant_id','protected','system_key','created_at');
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER bootstrap_immutable BEFORE UPDATE OR DELETE ON bootstrap_state FOR EACH ROW EXECUTE FUNCTION reject_mutation();
ALTER TABLE admin_audit_events ADD CONSTRAINT audit_action CHECK(action IN ('customer.created','customer.updated','tenant.created','tenant.updated','tenant.suspended','user.updated','user.suspended','identity.disabled','membership.created','membership.candidate_provisioned','membership.updated','membership.suspended','membership.roles_changed','membership.scope_changed','role.created','role.updated','role.deleted','dashboard.access_changed','invitation.created','invitation.revoked','invitation.accepted','platform.access_changed'));
CREATE FUNCTION role_child_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=control,pg_catalog AS $$
DECLARE role_record roles;
BEGIN
 SELECT * INTO role_record FROM roles WHERE id=NEW.role_id;
 IF TG_TABLE_NAME='platform_assignment_roles' THEN
  IF role_record.scope IS DISTINCT FROM 'platform' THEN RAISE EXCEPTION 'invalid platform role'; END IF;
 ELSIF TG_TABLE_NAME IN ('membership_roles','dashboard_grants') THEN
  IF role_record.scope IS DISTINCT FROM 'tenant' OR (role_record.protected=0 AND role_record.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN RAISE EXCEPTION 'invalid tenant role'; END IF;
 ELSIF TG_TABLE_NAME='role_metric_domains' THEN
  IF role_record.scope IS DISTINCT FROM 'tenant' THEN RAISE EXCEPTION 'invalid domain plane'; END IF;
 ELSIF TG_TABLE_NAME='role_permissions' THEN
  IF NOT ((role_record.scope='tenant' AND NEW.permission IN ('dashboard:view','dashboard:create','dashboard:edit','dashboard:share','analytics:query','ai:generate','ai:edit','tenant:view','tenant:manage','users:view','users:manage','users:invite','roles:view','roles:manage','data_scopes:view','data_scopes:manage','dashboard_access:view','dashboard_access:manage')) OR
   (role_record.scope='platform' AND NEW.permission IN ('platform:customers:view','platform:customers:manage','platform:tenants:view','platform:tenants:manage','platform:users:view','platform:users:manage'))) THEN RAISE EXCEPTION 'invalid permission plane'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER permission_plane BEFORE INSERT OR UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION role_child_guard();
CREATE TRIGGER domain_plane BEFORE INSERT OR UPDATE ON role_metric_domains FOR EACH ROW EXECUTE FUNCTION role_child_guard();
CREATE TRIGGER membership_role_plane BEFORE INSERT OR UPDATE ON membership_roles FOR EACH ROW EXECUTE FUNCTION role_child_guard();
CREATE TRIGGER platform_role_plane BEFORE INSERT OR UPDATE ON platform_assignment_roles FOR EACH ROW EXECUTE FUNCTION role_child_guard();
CREATE TRIGGER dashboard_grant_role BEFORE INSERT OR UPDATE ON dashboard_grants FOR EACH ROW WHEN (NEW.subject_type='role') EXECUTE FUNCTION role_child_guard();
CREATE FUNCTION grant_visibility_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=control,pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dashboard_records WHERE tenant_id=NEW.tenant_id AND id=NEW.dashboard_id AND scope='restricted') THEN RAISE EXCEPTION 'invalid grant visibility'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER dashboard_grant_visibility BEFORE INSERT OR UPDATE ON dashboard_grants FOR EACH ROW EXECUTE FUNCTION grant_visibility_guard();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA control FROM PUBLIC;
GRANT USAGE ON SCHEMA control TO control_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA control TO control_app;
REVOKE UPDATE,DELETE ON control.admin_audit_events,control.bootstrap_state FROM control_app;
