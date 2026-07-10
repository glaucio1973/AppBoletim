import "server-only";
import axios from "axios";
import https from "node:https";
import { XMLParser } from "fast-xml-parser";
import { env } from "@/lib/env";
import { TotvsIndisponivelError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { LinhaCuboNotas } from "@/lib/totvs/types";

/**
 * Cliente SOAP para o webservice TOTVS RM `wsConsultaSQL` (IwsConsultaSQL).
 *
 * Contrato CONFIRMADO em teste real (RA 20131249, PERIODOLETIVO=2026,
 * FILIAL=1, sentença CUBO.07):
 *   - operação: `RealizarConsultaSQL` (prefixo `tot:`, namespace
 *     `http://www.totvs.com/`)
 *   - elementos do corpo, nessa ordem: `codSentenca`, `codColigada`,
 *     `codSistema`, `parameters`
 *   - `parameters` é uma STRING no formato `CHAVE=VALOR;CHAVE=VALOR;...`
 *     (não é XML aninhado)
 *   - sem elemento `outputType`
 *   - `SOAPAction` precisa do nome da interface: `http://www.totvs.com/IwsConsultaSQL/RealizarConsultaSQL`
 *     (só `http://www.totvs.com/RealizarConsultaSQL`, sem o `IwsConsultaSQL/`,
 *     faz o servidor devolver `202 Accepted` com corpo vazio, sem nunca
 *     processar a chamada)
 *   - resposta: SOAP normal, `RealizarConsultaSQLResult` contém um
 *     `NewDataSet` (DataSet .NET) serializado como texto XML‑escapado, com
 *     uma linha `<Resultado>` por registro
 *   - Basic Auth com usuário técnico de integração; certificado autoassinado
 *
 * Tudo isso é configurável via env (`TOTVS_SOAP_OPERATION`,
 * `TOTVS_SOAP_ACTION`, `TOTVS_SOAP_NAMESPACE`) caso mude em outro ambiente.
 */

interface ConsultaSqlParams {
  codConsulta: string;
  parametros: Record<string, string | number>;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string
  ));
}

/** Formato confirmado: "CHAVE=VALOR;CHAVE=VALOR;..." (não XML aninhado). */
function buildParametrosString(parametros: Record<string, string | number>): string {
  return Object.entries(parametros)
    .map(([nome, valor]) => `${nome}=${valor}`)
    .join(";");
}

function buildEnvelope({ codConsulta, parametros }: ConsultaSqlParams): string {
  const op = env.TOTVS_SOAP_OPERATION;
  const parametrosStr = buildParametrosString(parametros);
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tot="${env.TOTVS_SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <tot:${op}>
      <tot:codSentenca>${escapeXml(codConsulta)}</tot:codSentenca>
      <tot:codColigada>${escapeXml(env.TOTVS_COD_COLIGADA)}</tot:codColigada>
      <tot:codSistema>${escapeXml(env.TOTVS_COD_SISTEMA)}</tot:codSistema>
      <tot:parameters>${escapeXml(parametrosStr)}</tot:parameters>
    </tot:${op}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Extrai as linhas do dataset devolvido dentro do `<...Result>` do SOAP.
 * Suporta o formato mais comum de DataSet .NET serializado em XML
 * (`<NewDataSet><Table>...</Table></NewDataSet>`) e um formato genérico de
 * linhas repetidas. Ajuste aqui caso o formato real seja diferente.
 */
function parseConsultaSqlResponse(xmlBody: string): LinhaCuboNotas[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
  });

  const envelope = parser.parse(xmlBody);
  const body = envelope?.Envelope?.Body;
  if (!body) {
    throw new Error("SOAP Envelope sem Body na resposta da TOTVS.");
  }

  // Encontra a primeira propriedade do Body que termine com "Response" (independe do nome exato da operação)
  const responseKey = Object.keys(body).find((k) => k.toLowerCase().endsWith("response"));
  const responseNode = responseKey ? body[responseKey] : body;

  const resultKey = Object.keys(responseNode ?? {}).find((k) => k.toLowerCase().endsWith("result"));
  const resultValue = resultKey ? responseNode[resultKey] : undefined;

  if (typeof resultValue !== "string" || resultValue.trim().length === 0) {
    return [];
  }

  const innerXml = resultValue.trim();
  if (!innerXml.startsWith("<")) {
    return [];
  }

  const dataset = parser.parse(innerXml);
  return extrairLinhas(dataset);
}

function extrairLinhas(node: unknown): LinhaCuboNotas[] {
  if (!node || typeof node !== "object") return [];

  // Procura recursivamente pelo primeiro array de objetos "planos" (linhas de tabela)
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      const primeiro = current[0];
      if (primeiro && typeof primeiro === "object" && !Array.isArray(primeiro)) {
        return current as LinhaCuboNotas[];
      }
    } else if (current && typeof current === "object") {
      for (const value of Object.values(current as Record<string, unknown>)) {
        stack.push(value);
      }
    }
  }
  return [];
}

export async function callConsultaSql(params: ConsultaSqlParams): Promise<LinhaCuboNotas[]> {
  if (!env.TOTVS_BASE_URL || !env.TOTVS_USERNAME || !env.TOTVS_PASSWORD) {
    throw new TotvsIndisponivelError("Configuração do webservice TOTVS incompleta (.env).");
  }

  const envelope = buildEnvelope(params);
  const httpsAgent = new https.Agent({ rejectUnauthorized: !env.TOTVS_IGNORE_SELF_SIGNED_CERT });

  try {
    const response = await axios.post<string>(env.TOTVS_BASE_URL, envelope, {
      httpsAgent,
      auth: { username: env.TOTVS_USERNAME, password: env.TOTVS_PASSWORD },
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: env.TOTVS_SOAP_ACTION,
      },
      timeout: env.TOTVS_TIMEOUT_MS,
      responseType: "text",
    });

    return parseConsultaSqlResponse(response.data);
  } catch (error) {
    logger.error("totvs.callConsultaSql falhou", {
      codConsulta: params.codConsulta,
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      message: (error as Error).message,
    });
    throw new TotvsIndisponivelError();
  }
}
