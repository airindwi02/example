import { NextResponse, type NextRequest } from "next/server";
import { databaseAuthEnabled } from "./lib/auth-config";
import { requireReady } from "./lib/auth";
import { accountById } from "./lib/auth-repository";
import { canEnter, dashboards, isRole } from "./lib/auth-policy";
import { credentialVersion, decodeSession } from "./lib/session";

export async function proxy(request: NextRequest) {
  if (!databaseAuthEnabled()) return NextResponse.next();
  // These files are public assets stored below role-named folders. They must
  // not be redirected to a dashboard when Next/Image fetches them without a session.
  if (/\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)$/i.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  try {
    await requireReady();
    const session = await decodeSession(request.cookies.get("alana_session")?.value);
    const account = session ? await accountById(session.userId) : null;
    if (!session || !account || account.status_akun !== "ACTIVE" || !isRole(account.peran) || credentialVersion(account.password_hash) !== session.credentialVersion) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const root = "/" + request.nextUrl.pathname.split("/")[1];
    if (!canEnter(account, root)) return NextResponse.redirect(new URL(dashboards[account.peran], request.url));
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return new NextResponse("Autentikasi belum siap. Hubungi administrator.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const config = { matcher: ["/owner/:path*", "/kasir/:path*", "/baker/:path*", "/daily-worker/:path*"] };
