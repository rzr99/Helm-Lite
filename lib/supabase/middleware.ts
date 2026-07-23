import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request to keep the signed-in session fresh, so people
// don't get logged out mid-shift when their access token expires.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Daily fresh login: everyone must sign in again once their session marker
  // is more than 24h old. The marker (helm_login_at) is stamped at login;
  // when it's missing or stale we clear the session and bounce to /login.
  const path = request.nextUrl.pathname;
  if (user && path !== "/login") {
    const loginAt = Number(request.cookies.get("helm_login_at")?.value);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const stale =
      !loginAt || Number.isNaN(loginAt) || Date.now() - loginAt > ONE_DAY_MS;
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
  }

  return response;
}
