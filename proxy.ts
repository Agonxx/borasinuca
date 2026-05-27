import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup"];
const ONBOARDING_ROUTE = "/onboarding";
const APP_ROUTES = ["/home", "/sortear", "/partidas", "/ranking", "/bolao"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Não autenticado → login
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticado tentando acessar login → home
  if (user && PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Autenticado em rota do app → checar se tem grupo
  if (user && APP_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("player_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
    }
  }

  // No onboarding mas já tem grupo → home
  if (user && pathname === ONBOARDING_ROUTE) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("player_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
