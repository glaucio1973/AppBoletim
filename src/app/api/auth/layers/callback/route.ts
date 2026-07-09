import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, fetchUserInfo, resolveStudentIdentifier } from "@/lib/layers/authService";
import { createSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const STATE_COOKIE = "appboletim_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const baseUrl = env.APP_BASE_URL;

  const errorParam = searchParams.get("error");
  if (errorParam) {
    logger.warn("layers.callback recebeu erro do IdP", { error: errorParam });
    return redirectToLogin(baseUrl, "login_cancelado");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    logger.warn("layers.callback state inválido (possível CSRF)");
    return redirectToLogin(baseUrl, "state_invalido");
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const userInfo = await fetchUserInfo(tokenResponse.access_token);
    const ra = resolveStudentIdentifier(userInfo);

    if (!ra) {
      logger.warn("layers.callback sem RA resolvido no userinfo");
      return redirectToLogin(baseUrl, "sem_ra");
    }

    await createSession({
      ra,
      nome: (userInfo.name as string) || "Aluno",
      email: userInfo.email,
    });

    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  } catch (error) {
    logger.error("layers.callback falhou", { message: (error as Error).message });
    return redirectToLogin(baseUrl, "falha_autenticacao");
  }
}

function redirectToLogin(baseUrl: string, errorCode: string) {
  const url = new URL("/login", baseUrl);
  url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
}
