import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { callConsultaSql } from "@/lib/totvs/client";
import { gerarNotasMock } from "@/lib/totvs/mockData";
import { mapRegistrosParaBoletim } from "@/lib/totvs/mapping";
import type { BoletimAluno } from "@/lib/totvs/types";

const RA_SANITIZE_RE = /[^A-Za-z0-9.\-]/g;

function sanitizarRA(raBruto: string): string {
  return raBruto.replace(RA_SANITIZE_RE, "");
}

/**
 * Busca o boletim (CUBO.07) de um aluno.
 *
 * `ra` hoje pode vir do parâmetro fixo TOTVS_RA_PADRAO (fase 1) ou, futuramente,
 * do RA resolvido pela sessão Layers autenticada (fase 2) — ver
 * src/app/api/boletim/route.ts, que já busca o RA a partir da sessão em vez de
 * aceitar um RA vindo do cliente.
 */
export async function getBoletimAluno(raEntrada: string): Promise<BoletimAluno> {
  const ra = sanitizarRA(raEntrada);
  const periodoLetivo = env.TOTVS_PERIODO_LETIVO;

  if (env.TOTVS_MODE === "mock") {
    logger.info("totvsService: usando dados mockados", { ra: logger.mask(ra) });
    const registros = gerarNotasMock(ra, periodoLetivo);
    const boletim = mapRegistrosParaBoletim(registros, {
      ra,
      mediaMinima: env.TOTVS_MEDIA_MINIMA,
      anoLetivoPadrao: periodoLetivo,
    });
    return { ...boletim, fonte: "mock" };
  }

  const registros = await callConsultaSql({
    codConsulta: env.TOTVS_SENTENCA_NOTAS,
    parametros: {
      PERIODOLETIVO: periodoLetivo,
      FILIAL: env.TOTVS_FILIAL,
      RA: ra,
    },
  });

  return mapRegistrosParaBoletim(registros, {
    ra,
    mediaMinima: env.TOTVS_MEDIA_MINIMA,
    anoLetivoPadrao: periodoLetivo,
  });
}
