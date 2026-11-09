import "server-only";
import { redirect } from "next/navigation";
import { databaseAuthEnabled, sessionPassword } from "./auth-config";
import { accountById, assertAuthSchema } from "./auth-repository";
import { canEnter, dashboards, isRole } from "./auth-policy";
import { credentialVersion, readSession } from "./session";
export async function requireReady() {
  if (!databaseAuthEnabled()) throw new Error("Database authentication is not enabled.");
  sessionPassword();
  await assertAuthSchema();
}
export async function authenticatedAccount() {
  await requireReady();
  const session = await readSession();
  if (!session) return null;
  const account = await accountById(session.userId);
  return account && account.status_akun === "ACTIVE" && isRole(account.peran) && session.credentialVersion === credentialVersion(account.password_hash) ? account : null;
}
export async function requireDashboard(path: string) {
  // Compatibility mode is explicitly a frontend preview, never a real session.
  if (!databaseAuthEnabled()) return;
  const account = await authenticatedAccount();
  if (!account) redirect("/login");
  if (!canEnter(account, path)) redirect(isRole(account.peran) ? dashboards[account.peran] : "/login");
}
