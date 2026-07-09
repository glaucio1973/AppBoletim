import "server-only";
import { z } from "zod";

/**
 * Única fonte de leitura de variáveis de ambiente do servidor.
 * Nunca importar este módulo em Client Components — o `server-only`
 * faz o build falhar se isso acontecer, evitando vazar segredos para o bundle do cliente.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET deve ter pelo menos 32 caracteres"),

  LAYERS_CLIENT_ID: z.string().default(""),
  LAYERS_CLIENT_SECRET: z.string().default(""),
  LAYERS_REDIRECT_URI: z.string().default("http://localhost:3000/api/auth/layers/callback"),
  LAYERS_AUTH_URL: z.string().default(""),
  LAYERS_TOKEN_URL: z.string().default(""),
  LAYERS_USERINFO_URL: z.string().default(""),
  LAYERS_SCOPES: z.string().default("openid profile email"),
  LAYERS_STUDENT_ID_FIELD: z.string().default("ra"),
  LAYERS_FAKE_IDP: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  TOTVS_MODE: z.enum(["mock", "real"]).default("mock"),
  TOTVS_BASE_URL: z.string().default(""),
  TOTVS_USERNAME: z.string().default(""),
  TOTVS_PASSWORD: z.string().default(""),
  TOTVS_SOAP_OPERATION: z.string().default("RealizaConsulta"),
  TOTVS_SOAP_ACTION: z.string().default("http://www.totvs.com/RealizaConsulta"),
  TOTVS_SOAP_NAMESPACE: z.string().default("http://www.totvs.com/"),
  TOTVS_COD_COLIGADA: z.string().default("1"),
  TOTVS_COD_SISTEMA: z.string().default("G"),
  TOTVS_SENTENCA_NOTAS: z.string().default("CUBO.07"),
  TOTVS_FILIAL: z.string().default("1"),
  TOTVS_PERIODO_LETIVO: z.string().default(String(new Date().getFullYear())),
  TOTVS_RA_PADRAO: z.string().default(""),
  TOTVS_MEDIA_MINIMA: z
    .string()
    .default("7.0")
    .transform((v) => Number(v)),
  TOTVS_IGNORE_SELF_SIGNED_CERT: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  TOTVS_TIMEOUT_MS: z
    .string()
    .default("15000")
    .transform((v) => Number(v)),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ambiente inválida. Confira o ".env" (veja ".env.example"):\n${issues}`
    );
  }
  return parsed.data;
}

export const env = loadEnv();

export const isDev = env.NODE_ENV !== "production";
