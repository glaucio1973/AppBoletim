import { NextRequest, NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Proxy (substitui o antigo middleware.ts a partir do Next.js 16) — checagem
 * OTIMISTA de sessão, só lê o cookie assinado, sem tocar no TOTVS. A checagem
 * definitiva acontece na DAL (src/lib/dal.ts) em cada rota/page protegida.
 */
const PROTECTED_ROUTES = ["/dashboard", "/boletim"];
const PUBLIC_ONLY_ROUTES = ["/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicOnly = PUBLIC_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected && !isPublicOnly) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(token);

  if (isProtected && !session?.ra) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicOnly && session?.ra) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/boletim/:path*", "/login"],
};
