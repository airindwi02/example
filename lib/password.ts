import "server-only";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string) {
  // Argon2id = 2; the package's ambient const enum cannot be imported with isolatedModules.
  return hash(password, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}
export async function verifyPassword(encoded: string, password: string) {
  if (!encoded.startsWith("$argon2id$") || password.length > 128) return false;
  try { return await verify(encoded, password); } catch { return false; }
}
