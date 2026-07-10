import type {
  AvaliacaoComposicao,
  BoletimAluno,
  DisciplinaBoletim,
  LinhaCuboNotas,
  NotaTrimestre,
} from "@/lib/totvs/types";

/**
 * Regras de mapeamento da sentença CUBO.07 → domínio do boletim.
 *
 * Contrato CONFIRMADO em teste real (RA 20131249, PERIODOLETIVO=2026): cada
 * linha tem uma coluna `ETAPA` (período: "01 - 1º TRI"/"02 - 2º TRI"/
 * "03 - 3º TRI", ou os pseudo-períodos anuais "04 - MÉDIA ANUAL",
 * "05 - RECUP. FINAL", "06 - MÉDIA FINAL") e uma coluna `PROVA` (tipo de
 * avaliação dentro do período: "01 - AV1", "02 - AV2", "03 - AV3",
 * "04 - BÔNUS TRI", "05 - MÉDIA", "06 - REC PARALELA TRI",
 * "07 - MÉDIA TRIMESTRAL", "08 - MÉDIA ANUAL", "09 - REC FINAL",
 * "10 - BÔNUS FINAL", "11 - MÉDIA FINAL"). Muitas vêm sem `NOTA` quando o
 * aluno não realizou aquela avaliação.
 */

const TRIMESTRE_RE = /(\d)\s*º?\s*TRI/i;

type TipoEtapa =
  | "AV1"
  | "AV2"
  | "AV3"
  | "BONUS"
  | "MEDIA"
  | "REC_PARALELA"
  | "MEDIA_TRIMESTRAL"
  | "MEDIA_ANUAL"
  | "REC_FINAL"
  | "MEDIA_FINAL"
  | "OUTRO";

const DESCRICAO_POR_TIPO: Record<TipoEtapa, string> = {
  AV1: "AV1",
  AV2: "AV2",
  AV3: "AV3",
  BONUS: "Bônus",
  MEDIA: "Média",
  REC_PARALELA: "Recuperação Paralela",
  MEDIA_TRIMESTRAL: "Média Trimestral",
  MEDIA_ANUAL: "Média Anual",
  REC_FINAL: "Recuperação Final",
  MEDIA_FINAL: "Média Final",
  OUTRO: "Outra avaliação",
};

// Ordem de exibição no drilldown do trimestre. O Bônus é propositalmente
// omitido (não aparece na composição exibida ao usuário).
const ORDEM_COMPOSICAO: TipoEtapa[] = ["AV1", "AV2", "AV3", "MEDIA", "REC_PARALELA", "MEDIA_TRIMESTRAL"];

function detectarTipoEtapa(provaBruta: string): TipoEtapa {
  const etapa = provaBruta.toUpperCase();
  // Ordem importa: variantes mais específicas de "MÉDIA"/"REC" precisam ser
  // checadas antes das genéricas ("MÉDIA", "REC PARALELA").
  if (etapa.includes("MÉDIA FINAL") || etapa.includes("MEDIA FINAL")) return "MEDIA_FINAL";
  if (
    etapa.includes("REC FINAL") ||
    etapa.includes("RECUP. FINAL") ||
    etapa.includes("RECUP FINAL") ||
    etapa.includes("RECUPERAÇÃO FINAL") ||
    etapa.includes("RECUPERACAO FINAL")
  )
    return "REC_FINAL";
  if (etapa.includes("MÉDIA TRIMESTRAL") || etapa.includes("MEDIA TRIMESTRAL")) return "MEDIA_TRIMESTRAL";
  if (etapa.includes("MÉDIA ANUAL") || etapa.includes("MEDIA ANUAL")) return "MEDIA_ANUAL";
  if (etapa.includes("REC PARALELA")) return "REC_PARALELA";
  if (etapa.includes("BÔNUS") || etapa.includes("BONUS")) return "BONUS";
  if (etapa.includes("AV1")) return "AV1";
  if (etapa.includes("AV2")) return "AV2";
  if (etapa.includes("AV3")) return "AV3";
  if (etapa.includes("MÉDIA") || etapa.includes("MEDIA")) return "MEDIA";
  return "OUTRO";
}

function ordemDeTipo(tipo: TipoEtapa): number {
  const indice = ORDEM_COMPOSICAO.indexOf(tipo);
  return indice === -1 ? ORDEM_COMPOSICAO.length : indice;
}

function parseTrimestre(etapa: string): 1 | 2 | 3 | null {
  const match = etapa.match(TRIMESTRE_RE);
  if (!match) return null;
  const n = Number(match[1]);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

function parseNota(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function mapRegistrosParaBoletim(
  registros: LinhaCuboNotas[],
  opts: { ra: string; mediaMinima: number; anoLetivoPadrao: string }
): BoletimAluno {
  const registrosDoAluno = registros.filter((r) => !r.RA || String(r.RA).trim() === opts.ra);
  const fonte = registrosDoAluno.length > 0 ? registrosDoAluno : registros;

  const nome = String(fonte[0]?.NOME ?? "Aluno");
  const turma = fonte[0]?.CODTURMA ? String(fonte[0]?.CODTURMA) : undefined;
  const serie = fonte[0]?.SERIE ? String(fonte[0]?.SERIE) : undefined;
  const anoLetivo = fonte[0]?.CODPERLET ? String(fonte[0]?.CODPERLET) : opts.anoLetivoPadrao;

  const porDisciplina = new Map<string, LinhaCuboNotas[]>();
  for (const registro of fonte) {
    const disciplina = String(registro.DISCIPLINA ?? "").trim();
    if (!disciplina) continue;
    if (!porDisciplina.has(disciplina)) porDisciplina.set(disciplina, []);
    porDisciplina.get(disciplina)!.push(registro);
  }

  const disciplinas: DisciplinaBoletim[] = [];

  for (const [disciplina, linhas] of porDisciplina) {
    const ordem = Number(linhas[0]?.ORDEM ?? 999) || 999;

    const trimestreMap = new Map<1 | 2 | 3, { tipo: TipoEtapa; item: AvaliacaoComposicao }[]>();
    let recuperacaoFinal: number | null = null;
    let mediaFinal: number | null = null;
    let mediaAnualOficial: number | null = null;

    for (const linha of linhas) {
      const etapaBruta = String(linha.ETAPA ?? "").trim();
      const provaBruta = String(linha.PROVA ?? "").trim();
      if (!etapaBruta && !provaBruta) continue;

      const tipo = detectarTipoEtapa(provaBruta || etapaBruta);
      const nota = parseNota(linha.NOTA);

      if (tipo === "REC_FINAL") {
        recuperacaoFinal = nota ?? recuperacaoFinal;
        continue;
      }
      if (tipo === "MEDIA_FINAL") {
        mediaFinal = nota ?? mediaFinal;
        continue;
      }
      if (tipo === "MEDIA_ANUAL") {
        mediaAnualOficial = nota ?? mediaAnualOficial;
        continue;
      }
      if (tipo === "BONUS") continue; // omitido do drilldown a pedido

      const trimestre = parseTrimestre(etapaBruta);
      if (!trimestre) continue; // etapa sem trimestre reconhecível — descartada (ex: recuperação final anual)

      if (!trimestreMap.has(trimestre)) trimestreMap.set(trimestre, []);
      trimestreMap.get(trimestre)!.push({
        tipo,
        item: {
          etapa: provaBruta || etapaBruta,
          descricao: DESCRICAO_POR_TIPO[tipo],
          nota,
          realizada: nota !== null,
          peso: null, // TODO: sentença atual não retorna peso por avaliação
        },
      });
    }

    const trimestres: NotaTrimestre[] = [1, 2, 3]
      .filter((t): t is 1 | 2 | 3 => trimestreMap.has(t as 1 | 2 | 3))
      .map((trimestre) => {
        const composicao = [...trimestreMap.get(trimestre)!]
          .sort((a, b) => ordemDeTipo(a.tipo) - ordemDeTipo(b.tipo))
          .map((c) => c.item);
        const linhaMedia = composicao.find((c) => c.descricao === "Média Trimestral");
        return {
          trimestre,
          mediaTrimestral: linhaMedia?.nota ?? null,
          composicao,
        };
      });

    const mediasFechadas = trimestres.map((t) => t.mediaTrimestral).filter((n): n is number => n !== null);
    const mediaAnualCalculada =
      mediasFechadas.length > 0 ? round1(mediasFechadas.reduce((a, b) => a + b, 0) / mediasFechadas.length) : null;
    // Preferimos a "Média Anual" oficial retornada pela TOTVS quando existe —
    // só caímos para a média calculada (simples, dos trimestres fechados) se
    // a sentença ainda não tiver essa linha (ex: ano letivo em andamento).
    const mediaAnual = mediaAnualOficial ?? mediaAnualCalculada;
    const mediaAnualParcial = mediaAnualOficial === null && mediasFechadas.length > 0 && mediasFechadas.length < 3;

    const notaFinalParaComparacao = mediaFinal ?? mediaAnual;
    const abaixoDaMedia = notaFinalParaComparacao !== null && notaFinalParaComparacao < opts.mediaMinima;

    disciplinas.push({
      disciplina,
      ordem,
      trimestres,
      mediaAnual,
      mediaAnualParcial,
      recuperacaoFinal,
      mediaFinal,
      abaixoDaMedia,
    });
  }

  disciplinas.sort((a, b) => a.ordem - b.ordem || a.disciplina.localeCompare(b.disciplina));

  return {
    aluno: { nome, ra: opts.ra, turma, serie },
    anoLetivo,
    mediaMinima: opts.mediaMinima,
    disciplinas,
    geradoEm: new Date().toISOString(),
    fonte: "totvs",
  };
}
