import "server-only";
import { headers } from "next/headers";
import { localStaffSignupConfigured } from "./auth-config";
export function isLoopbackHost(value: string | null) {
  if (!value || /[\s/@\\]/.test(value)) return false;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(`http://${value}`).hostname); } catch { return false; }
}
export async function localStaffSignupRequest() {
  if (!localStaffSignupConfigured()) return false;
  return localOriginRequest();
}
export async function localOriginRequest() {
  const h = await headers();
  if (!isLoopbackHost(h.get("host"))) return false;
  const origin = h.get("origin");
  try { return !!origin && new URL(origin).host === h.get("host") && ["http:", "https:"].includes(new URL(origin).protocol); } catch { return false; }
}
