import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import { createHmac } from "node:crypto";
import { sessionPassword } from "./auth-config";
const cookieName = "alana_session";
const ttl = 8 * 60 * 60;
type Session = { userId: string; credentialVersion: string; expires: number };
export function credentialVersion(hash: string) {
  return createHmac("sha256", sessionPassword()).update(hash).digest("hex");
}
export async function readSession(): Promise<Session | null> {
  const value = (await cookies()).get(cookieName)?.value;
  return decodeSession(value);
}
export async function decodeSession(value?: string): Promise<Session | null> {
  if (!value) return null;
  try {
    const session = await unsealData<Session>(value, { password: sessionPassword(), ttl });
    return typeof session.userId === "string" && typeof session.credentialVersion === "string" && session.expires > Date.now() ? session : null;
  } catch { return null; }
}
export async function createSession(userId: string, hash: string) {
  const value = await sealData({ userId, credentialVersion: credentialVersion(hash), expires: Date.now() + ttl * 1000 }, { password: sessionPassword(), ttl });
  (await cookies()).set(cookieName, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ttl });
}
export async function deleteSession() { (await cookies()).delete(cookieName); }
