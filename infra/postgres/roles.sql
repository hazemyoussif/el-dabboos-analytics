-- Run once with the isolated database administrator, before migrations.
-- NOLOGIN group roles never contain passwords. Provision dedicated login identities separately.
CREATE ROLE dabboos_migrator NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE dabboos_ingestor NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE dabboos_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE dabboos_source_reader NOLOGIN NOSUPERUSER NOBYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$ BEGIN EXECUTE format('GRANT CREATE ON DATABASE %I TO dabboos_migrator', current_database()); END $$;
