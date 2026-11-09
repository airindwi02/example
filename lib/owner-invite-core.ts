import { createHash, createPublicKey, timingSafeEqual, verify, type JsonWebKey } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type OwnerClaim = { version: 1; jti: string; username: string; database: string; owners: string; issuedAt: number; expiresAt: number };
export type OwnerTrust = { publicKey: JsonWebKey; database: string; payloadDigest: string; stateDirectory: string };
export function databaseBinding(connectionString: string) {
  const u = new URL(connectionString);
  return createHash("sha256").update(JSON.stringify([u.protocol, u.hostname.toLowerCase(), u.port || "5432", decodeURIComponent(u.pathname), u.searchParams.get("schema") || "public"])).digest("hex");
}
export function ownerBaseline(rows: unknown[]) {
  const fields = ["id_pengguna", "nama_pengguna", "username", "password_hash", "peran", "status_akun"];
  const canonical = (rows as Record<string, unknown>[]).map(row => fields.map(field => row[field]));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export function statePath(trust: OwnerTrust) { return path.join(trust.stateDirectory, trust.database + ".reserved"); }
export function verifyOwnerInvite(token: string, trust: OwnerTrust, database: string, username?: string, now = Date.now()): OwnerClaim {
  if (token.length > 4096) throw new Error("Invalid invitation.");
  const parts = token.split(".");
  if (parts.length !== 2 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error("Invalid invitation.");
  const payload = Buffer.from(parts[0], "base64url");
  const digest = createHash("sha256").update(payload).digest();
  const expected = Buffer.from(trust.payloadDigest, "hex");
  if (expected.length !== digest.length || !timingSafeEqual(digest, expected) || !verify("RSA-SHA256", payload, createPublicKey({ key: trust.publicKey, format: "jwk" }), Buffer.from(parts[1], "base64url"))) throw new Error("Invalid invitation.");
  const claim = JSON.parse(payload.toString("utf8")) as OwnerClaim;
  if (claim.version !== 1 || !/^[a-f0-9]{64}$/.test(claim.jti) || !/^[A-Za-z0-9_.-]{3,20}$/.test(claim.username) || claim.database !== database || trust.database !== database || (username !== undefined && claim.username !== username) || !Number.isSafeInteger(claim.issuedAt) || !Number.isSafeInteger(claim.expiresAt) || claim.issuedAt > now + 30000 || claim.expiresAt <= now || claim.expiresAt - claim.issuedAt > 15 * 60 * 1000 || claim.expiresAt <= claim.issuedAt || !/^[a-f0-9]{64}$/.test(claim.owners) || existsSync(statePath(trust))) throw new Error("Invitation unavailable.");
  return claim;
}
export function reserveOwnerInvite(trust: OwnerTrust, claim: OwnerClaim) {
  // Atomic exclusive creation plus fsync: never remove/reuse after any failure or restart.
  const fd = openSync(statePath(trust), "wx", 0o600);
  try { writeFileSync(fd, JSON.stringify({ version: 1, reservedAt: new Date().toISOString(), invitation: createHash("sha256").update(claim.jti).digest("hex") })); fsyncSync(fd); } finally { closeSync(fd); }
}
export function readOwnerTrust(filename: string): OwnerTrust {
  const trust = JSON.parse(readFileSync(filename, "utf8")) as OwnerTrust;
  if (trust.publicKey?.kty !== "RSA" || !/^[a-f0-9]{64}$/.test(trust.database) || !/^[a-f0-9]{64}$/.test(trust.payloadDigest) || !path.isAbsolute(trust.stateDirectory)) throw new Error("Owner setup trust is invalid.");
  return trust;
}
