import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { env, isDev } from "@/lib/env";
import { registerFakeCode } from "@/lib/layers/devFakeStore";

/**
 * IdP falso — tela de "login" simulando o /authorize da Layers.
 * Só existe fora de produção e com LAYERS_FAKE_IDP=true. Nunca representa a
 * Layers real; serve apenas para exercitar o fluxo OAuth2 completo localmente.
 */
export async function GET(request: NextRequest) {
  if (!isDev || !env.LAYERS_FAKE_IDP) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Layers ID (simulado) — AppBoletim dev</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f2f4f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    form { background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.08); width: 340px; }
    h1 { font-size: 18px; margin: 0 0 4px; color: #006FBA; }
    p.badge { font-size: 12px; color: #9a6b00; background: #FFF6D6; border: 1px solid #FFE938; padding: 6px 10px; border-radius: 6px; margin: 0 0 20px; }
    label { display: block; font-size: 13px; margin-top: 12px; color: #333; }
    input { width: 100%; box-sizing: border-box; padding: 8px 10px; margin-top: 4px; border: 1px solid #ccc; border-radius: 6px; }
    button { margin-top: 20px; width: 100%; padding: 10px; background: #006FBA; color: #fff; border: none; border-radius: 4px 12px; font-weight: 600; cursor: pointer; }
    button:hover { opacity: .92; }
  </style>
</head>
<body>
  <form method="GET" action="/api/dev/fake-layers/authorize">
    <h1>Layers ID</h1>
    <p class="badge">IdP simulado — apenas ambiente de desenvolvimento</p>
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
    <input type="hidden" name="state" value="${escapeHtml(state)}" />
    <input type="hidden" name="submitted" value="1" />
    <label>Nome do aluno
      <input name="nome" required value="Aluno de Teste" />
    </label>
    <label>E-mail
      <input name="email" type="email" required value="aluno.teste@liessin.com.br" />
    </label>
    <label>RA (matrícula)
      <input name="ra" required value="20131249" />
    </label>
    <button type="submit">Entrar com Layers (simulado)</button>
  </form>
</body>
</html>`;

  if (searchParams.get("submitted") === "1") {
    const nome = searchParams.get("nome")?.trim() || "Aluno de Teste";
    const email = searchParams.get("email")?.trim() || "";
    const ra = searchParams.get("ra")?.trim() || "";

    const code = randomUUID();
    registerFakeCode(code, { nome, email, ra });

    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    target.searchParams.set("state", state);
    return NextResponse.redirect(target);
  }

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
