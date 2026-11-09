import "server-only";
export function databaseAuthEnabled() { return process.env.ALANA_DATABASE_AUTH === "enabled"; }
export function signupEnabled() { return databaseAuthEnabled() && process.env.ALANA_SIGNUP === "enabled"; }
export function approvalsEnabled() { return databaseAuthEnabled() && process.env.ALANA_APPROVALS === "enabled"; }
export function localStaffSignupConfigured() {
  return databaseAuthEnabled() && process.env.NODE_ENV === "development" && process.env.ALANA_LOCAL_STAFF_SIGNUP === "enabled";
}
export function ownerSetupConfigured() { return databaseAuthEnabled() && process.env.NODE_ENV === "development" && process.env.ALANA_OWNER_BOOTSTRAP === "enabled"; }
export function ownerRequestsConfigured() { return databaseAuthEnabled() && process.env.ALANA_OWNER_REQUESTS === "enabled"; }
export function sessionPassword() {
  const secret = process.env.ALANA_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication configuration is incomplete.");
  return secret;
}
