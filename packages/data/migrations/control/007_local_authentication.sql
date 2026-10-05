-- Better Auth 1.7.7 core schema, kept separate from product authorization.
CREATE SCHEMA auth;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
CREATE TABLE auth."user" (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,"emailVerified" boolean NOT NULL DEFAULT false,
 image text,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth.session (
 id text PRIMARY KEY,"expiresAt" timestamptz NOT NULL,token text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text,"userAgent" text,"userId" text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON auth.session("userId");
CREATE TABLE auth.account (
 id text PRIMARY KEY,"accountId" text NOT NULL,"providerId" text NOT NULL,"userId" text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
 "accessToken" text,"refreshToken" text,"idToken" text,"accessTokenExpiresAt" timestamptz,"refreshTokenExpiresAt" timestamptz,
 scope text,password text,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("providerId","accountId")
);
CREATE INDEX account_user_id_idx ON auth.account("userId");
CREATE TABLE auth.verification (
 id text PRIMARY KEY,identifier text NOT NULL,value text NOT NULL,"expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON auth.verification(identifier);
CREATE TABLE control.authentication_security_events (
 id text PRIMARY KEY,event text NOT NULL CHECK(event IN ('login_succeeded','login_failed','logout','sessions_revoked','local_identity_provisioned')),
 user_id text REFERENCES control.users(id),occurred_at timestamptz NOT NULL DEFAULT now(),operator_reference text
);
CREATE TRIGGER authentication_security_events_immutable BEFORE UPDATE OR DELETE ON control.authentication_security_events
 FOR EACH ROW EXECUTE FUNCTION control.reject_mutation();
GRANT USAGE ON SCHEMA auth TO control_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA auth TO control_app;
GRANT SELECT,INSERT ON control.authentication_security_events TO control_app;
