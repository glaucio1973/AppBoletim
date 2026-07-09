import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { buildAuthorizeUrl } from "@/lib/layers/authService";
import { env } from "@/lib/env";

const STATE_COOKIE = "appboletim_oauth_state";

/**
 * Inicia o fluxo OAuth2 Authorization Code: gera um `state` (proteção CSRF),
 * guarda em cookie httpOnly de curta duração e redireciona para o /authorize
 * da Layers (ou do IdP fake, se LAYERS_FAKE_IDP=true).
 */
export async function GET() {
  const state = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min é suficiente para o usuário completar o login
  });

  const authorizeUrl = buildAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}

export const OAUTH_STATE_COOKIE = STATE_COOKIE;
