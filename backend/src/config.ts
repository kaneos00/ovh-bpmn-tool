export async function loadConfigFromEnv() {
  return {
    port: parseInt(process.env.NODE_PORT!, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    userHeader: process.env.USER_HEADER || 'remote-user',
    userGroupsHeader: process.env.USER_GROUPS_HEADER || 'remote-user-groups',
    // Demo credential strategy only. Future SSO/OIDC settings should be separate
    // namespaced configuration (issuer, client ID, redirect URI, scopes, allowed
    // audiences/issuers, and secret via secret manager); do not overload these fields.
    // Demo credential strategy only. Future SSO/OIDC settings must be separate
    // configuration fields (issuer, client ID, redirect URI, scopes and trusted claims).
    // Do not overload demo credentials with identity-provider configuration.
    demoAuthUser: process.env.DEMO_AUTH_USER,
    demoAuthPassword: process.env.DEMO_AUTH_PASSWORD,
    demoAuthGroups:
      process.env.DEMO_AUTH_GROUPS ||
      'bpmn-tool-readwrite-demo,bpmn-tool-admin-demo',
    authSessionSecret: process.env.AUTH_SESSION_SECRET,
    database: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT!, 10),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: process.env.DATABASE_SSL,
    },
  };
}
