import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/** e.g. "admin.keystub.com" (set NEXT_PUBLIC_ADMIN_HOST to turn on the admin subdomain). */
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || "";
/** Pages shared by both sites (sign-in etc.) and the API: served as-is on the admin host. */
const SHARED = /^\/(api|sign-in|sign-up|two-factor|forgot-password|reset-password|_next)(\/|$)/;

const protoFor = (host: string) => (/localhost|127\.0\.0\.1/.test(host) ? "http" : "https");

const toSignIn = (request: NextRequest, path: string, host?: string) => {
  const url = host ? new URL(`${protoFor(host)}://${host}/sign-in`) : new URL("/sign-in", request.url);
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
};

/**
 * 1. admin.keystub.com: "/tickets" is served by /admin/tickets (clean URLs), sign-in pages and the
 *    API are shared, and old "/admin/…" links redirect to the clean form.
 * 2. keystub.com/admin/… redirects to the admin host.
 * 3. Optimistic sign-in redirect for /app and Admin. Real authorization happens on every page
 *    and action (requireUser / requireStaff), not here.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  const signedIn = !!getSessionCookie(request);

  if (ADMIN_HOST && host === ADMIN_HOST) {
    if (pathname === "/admin" || pathname.startsWith("/admin/"))
      return NextResponse.redirect(`${protoFor(host)}://${host}${pathname.replace(/^\/admin/, "") || "/"}${search}`);
    if (SHARED.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
    if (!signedIn) return toSignIn(request, pathname + search, host);
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (ADMIN_HOST && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const proto = /localhost|127\.0\.0\.1/.test(ADMIN_HOST) ? "http" : "https";
    return NextResponse.redirect(`${proto}://${ADMIN_HOST}${pathname.replace(/^\/admin/, "") || "/"}${search}`);
  }

  if ((pathname.startsWith("/app") || pathname.startsWith("/admin")) && !signedIn) return toSignIn(request, pathname);
  return NextResponse.next();
}

export const config = {
  // Everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|manifest.webmanifest).*)"],
};
