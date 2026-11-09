import "server-only";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { prisma } from "./prisma";
import { localOriginRequest } from "./auth-local";
import { databaseBinding, ownerBaseline, readOwnerTrust, verifyOwnerInvite } from "./owner-invite-core";
import { registerFirstOwner } from "./owner-setup-service";
import { ownerSetupConfigured } from "./auth-config";
async function trustedSetup(token: string, username?: string) {
  if (!ownerSetupConfigured() || process.platform !== "win32" || !await localOriginRequest()) throw new Error("Owner setup unavailable.");
  // Fixed trust path; request parameters and environment cannot select another public key.
  const filename = path.join(process.env.ProgramData || "C:\\ProgramData", "ALANA", "OwnerSetup", "public.json");
  const checkScript = path.join(process.cwd(), "scripts", "check-owner-trust.ps1");
  const checked = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "RemoteSigned", "-File", checkScript], { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (checked !== "TRUST_OK") throw new Error("Administrator trust unavailable.");
  const trust = readOwnerTrust(filename);
  const database = databaseBinding(process.env.DATABASE_URL || "");
  const claim = verifyOwnerInvite(token, trust, database, username);
  const owners = await prisma.pengguna.findMany({ where: { peran: "Owner" }, orderBy: { id_pengguna: "asc" }, select: { id_pengguna: true, nama_pengguna: true, username: true, password_hash: true, peran: true, status_akun: true } });
  if (owners.length !== 1 || owners[0].status_akun !== "PENDING" || owners[0].password_hash.startsWith("$argon2") || ownerBaseline(owners) !== claim.owners) throw new Error("Bootstrap unavailable.");
  return { trust, database, claim };
}
export async function inspectOwnerInvite(token: string) { const { claim } = await trustedSetup(token); return { username: claim.username }; }
export async function createInvitedOwner(token: string, input: { username: string; name: string; phone: string; email: string | null; hash: string }) {
  const { trust, database } = await trustedSetup(token, input.username);
  await registerFirstOwner(prisma, trust, database, token, input);
}
