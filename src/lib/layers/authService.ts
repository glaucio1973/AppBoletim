import "server-only";
import axios from "axios";
import { env } from "@/lib/env";
import { LayersAuthError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { LayersTokenResponse, LayersUserInfo } from "@/lib/layers/types";

/**
 * Cliente OAuth2 Authorization Code para o SSO da Layers Education.
 *
 * IMPORTANTE — status da integração:
 * A documentação pública (layers.education e developers.layers.education) confirma
 * que a Layers oferece "Autenticação com OAuth2 e Sessão" sob o serviço Single
 * Sign-On, mas os paths exatos de /authorize, /token e /userinfo, client_id/secret
 * de produção e o schema do JSON de usuário NÃO estão documentados publicamente —
 * ficam disponíveis apenas após cadastro como parceiro/desenvolvedor.
 *
 * Por isso NENHUM endpoint está hardcoded aqui: tudo vem de env vars
 * (LAYERS_AUTH_URL / LAYERS_TOKEN_URL / LAYERS_USERINFO_URL). O candidato observado
 * publicamente para o portal de identidade é https://id.layers.digital — não
 * confirmado, ajuste em ".env" assim que a Layers fornecer os valores reais.
 *
 * Para desenvolvimento sem essas credenciais, use o IdP fake
 * (`LAYERS_FAKE_IDP=true`, ver src/app/api/dev/fake-layers/*).
 */

const CAMPOS_RA_FALLBACK = ["ra", "registration_number", "external_id", "cpf", "email"] as const;

/**
 * Quando LAYERS_FAKE_IDP=true (somente dev), ignora as URLs reais da Layers
 * configuradas em .env e usa o IdP simulado local — evita que alguém deixe
 * LAYERS_FAKE_IDP=true "esquecido" mas ainda assim tente falar com a Layers real.
 */
function authUrl(): string {
  return env.LAYERS_FAKE_IDP ? fakeUrl("/api/dev/fake-layers/authorize") : env.LAYERS_AUTH_URL;
}
function tokenUrl(): string {
  return env.LAYERS_FAKE_IDP ? fakeUrl("/api/dev/fake-layers/token") : env.LAYERS_TOKEN_URL;
}
function userinfoUrl(): string {
  return env.LAYERS_FAKE_IDP ? fakeUrl("/api/dev/fake-layers/userinfo") : env.LAYERS_USERINFO_URL;
}
function fakeUrl(path: string): string {
  return new URL(path, env.APP_BASE_URL).toString();
}

export function buildAuthorizeUrl(state: string): string {
  const base = authUrl();
  if (!base) {
    throw new LayersAuthError(
      "LAYERS_AUTH_URL não configurado. Preencha o .env com o endpoint de autorização da Layers."
    );
  }
  const url = new URL(base);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.LAYERS_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.LAYERS_REDIRECT_URI);
  url.searchParams.set("scope", env.LAYERS_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<LayersTokenResponse> {
  const url = tokenUrl();
  if (!url) {
    throw new LayersAuthError(
      "LAYERS_TOKEN_URL não configurado. Preencha o .env com o endpoint de token da Layers."
    );
  }
  try {
    const response = await axios.post<LayersTokenResponse>(
      url,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.LAYERS_REDIRECT_URI,
        client_id: env.LAYERS_CLIENT_ID,
        client_secret: env.LAYERS_CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    logger.error("layers.exchangeCodeForToken falhou", {
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
    });
    throw new LayersAuthError("Não foi possível trocar o código de autorização por um token.");
  }
}

export async function fetchUserInfo(accessToken: string): Promise<LayersUserInfo> {
  const url = userinfoUrl();
  if (!url) {
    throw new LayersAuthError(
      "LAYERS_USERINFO_URL não configurado. Preencha o .env com o endpoint de userinfo da Layers."
    );
  }
  try {
    const response = await axios.get<LayersUserInfo>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    logger.error("layers.fetchUserInfo falhou", {
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
    });
    throw new LayersAuthError("Não foi possível obter os dados do usuário autenticado.");
  }
}

/**
 * Resolve o RA (matrícula) do aluno a partir do JSON de /userinfo.
 * Tenta primeiro o campo configurado em LAYERS_STUDENT_ID_FIELD, depois uma
 * lista de fallbacks comuns. Retorna null se nada for encontrado — o chamador
 * deve tratar isso como AlunoSemRAError.
 *
 * TODO(fase 2 — Layers real): se o RA não vier direto do userinfo, implementar
 * aqui uma consulta adicional (ex: por CPF ou e-mail) contra o TOTVS para
 * localizar o RA antes de buscar as notas.
 */
export function resolveStudentIdentifier(userInfo: LayersUserInfo): string | null {
  const campoConfigurado = env.LAYERS_STUDENT_ID_FIELD;
  const candidatos = [campoConfigurado, ...CAMPOS_RA_FALLBACK];

  for (const campo of candidatos) {
    const valor = userInfo[campo];
    if (typeof valor === "string" && valor.trim().length > 0) {
      return valor.trim();
    }
  }
  return null;
}
