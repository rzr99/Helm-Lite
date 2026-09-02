import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request to keep the signed-in session fresh, so people
// don't get logged out mid-shift when their access token expires.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No Supabase session cookie → this is an anonymous request (a public page,
  // logged-out visitor, or a health ping). There's nothing to refresh or check,
  // so skip the auth round-trip entirely and let it through.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSession) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() refreshes the token cookie when it's close to expiry.
  // But cap it: a slow or unreachable Supabase must never hang edge middleware,
  // because that surfaces as a site-wide MIDDLEWARE_INVOCATION_TIMEOUT (504) on
  // EVERY page. If auth doesn't answer in time, skip the refresh + daily-login
  // check for this request — each page's own requireProfile guard still enforces
  // auth, so nothing becomes less secure; the app just stays up.
  const authTimeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 3000)
  );
  const user = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    authTimeout,
  ]).catch(() => null);

  // Idle-based fresh login: a session expires after 24h of INACTIVITY, not 24h
  // since login — so an agent who keeps using the app is never interrupted, but
  // an abandoned session still closes. The marker (helm_login_at) is stamped at
  // login and slid forward here on activity (throttled so we don't rewrite the
  // cookie every request). When it's missing or stale we clear the session and
  // bounce to /login.
  const path = request.nextUrl.pathname;
  if (user && path !== "/login") {
    const loginAt = Number(request.cookies.get("helm_login_at")?.value);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const age = Date.now() - loginAt;
    const stale = !loginAt || Number.isNaN(loginAt) || age > ONE_DAY_MS;
    if (stale) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "expired=1";
      const redirect = NextResponse.redirect(url);
      // Clear the Supabase auth cookies (sb-*) and our marker → fully signed out.
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith("sb-") || c.name === "helm_login_at") {
          redirect.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        }
      }
      return redirect;
    }
    // Active: slide the 24h idle window forward, at most every ~10 minutes.
    if (age > 10 * 60 * 1000) {
      response.cookies.set("helm_login_at", String(Date.now()), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return response;
}
