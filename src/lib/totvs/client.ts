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
 * IMPORTANTE — status desta integração:
 * A partir deste ambiente de desenvolvimento não foi possível obter o WSDL real
 * (`?wsdl` e uma chamada SOAP de sondagem retornam respostas vazias com
 * assinatura de dispositivo de borda/rede — `Server: Microsoft-HTTPAPI/2.0`,
 * `Content-Length: 0` — e não um SOAP Fault real da aplicação), então o nome
 * exato da operação, o namespace e o formato de saída do dataset NÃO estão
 * confirmados a partir daqui.
 *
 * O que ficou confirmado (ver README):
 *   - host, porta e path do endpoint (fornecidos pelo cliente)
 *   - Basic Auth com usuário técnico de integração
 *   - parâmetros de negócio da sentença CUBO.07: PERIODOLETIVO, FILIAL, RA
 *   - coligada=1, sistema=G
 *   - certificado autoassinado no servidor
 *
 * O nome da operação/SOAPAction/namespace são configuráveis via env
 * (TOTVS_SOAP_OPERATION/TOTVS_SOAP_ACTION/TOTVS_SOAP_NAMESPACE) para que
 * possam ser corrigidos sem alterar código assim que o WSDL puder ser
 * consultado a partir da rede da escola. `TOTVS_MODE=mock` (padrão) evita
 * depender disso durante o desenvolvimento.
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

function buildParametrosXml(parametros: Record<string, string | number>): string {
  const itens = Object.entries(parametros)
    .map(([nome, valor]) => `<parameter><nome>${escapeXml(nome)}</nome><valor>${escapeXml(String(valor))}</valor></parameter>`)
    .join("");
  return `<parameters>${itens}</parameters>`;
}

function buildEnvelope({ codConsulta, parametros }: ConsultaSqlParams): string {
  const parametrosXml = buildParametrosXml(parametros);
  const op = env.TOTVS_SOAP_OPERATION;
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${op} xmlns="${env.TOTVS_SOAP_NAMESPACE}">
      <codColigada>${escapeXml(env.TOTVS_COD_COLIGADA)}</codColigada>
      <codSistema>${escapeXml(env.TOTVS_COD_SISTEMA)}</codSistema>
      <codConsulta>${escapeXml(codConsulta)}</codConsulta>
      <parameters><![CDATA[${parametrosXml}]]></parameters>
      <outputType>2</outputType>
    </${op}>
  </soap:Body>
</soap:Envelope>`;
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
