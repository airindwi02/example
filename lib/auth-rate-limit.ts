import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { sessionPassword } from "./auth-config";
const windows = new Map<string, { count: number; expires: number }>();
async function consume(key: string, limit: number, seconds: number) {
  const url = process.env.ALANA_REDIS_REST_URL, token = process.env.ALANA_REDIS_REST_TOKEN;
  if (url && token) {
    if (process.env.NODE_ENV === "production" && new URL(url).protocol !== "https:") throw new Error("HTTPS rate limiter is required.");
    const response = await fetch(url, { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", "1", key, String(seconds)]), signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error("Rate limiter unavailable.");
    const data = await response.json();
    if (typeof data.result !== "number") throw new Error("Rate limiter unavailable.");
    return data.result <= limit;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Shared rate limiter is required in production.");
  const now = Date.now();
  for (const [key, value] of windows) if (value.expires <= now) windows.delete(key);
  if (windows.size >= 10000) return false;
  const value = windows.get(key) ?? { count: 0, expires: now + seconds * 1000 };
  value.count++; windows.set(key, value); return value.count <= limit;
}
export async function allowAttempt(action: string, identity: string) {
  const h = await headers();
  // Only trust this header when the deployment proxy overwrites it.
  const source = process.env.ALANA_TRUST_PROXY === "true" ? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
  const digest = (value: string) => createHmac("sha256", sessionPassword()).update(value).digest("hex");
  const ipAllowed = await consume(`alana:${action}:ip:${digest(source)}`, 30, 900);
  const accountAllowed = await consume(`alana:${action}:account:${digest(identity.toLowerCase())}`, 5, 900);
  return ipAllowed && accountAllowed;
}
