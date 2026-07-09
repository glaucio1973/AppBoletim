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
 * Confirmado em teste real anterior (RA 20131249): a sentença devolve VÁRIAS
 * linhas por disciplina + trimestre, uma para cada etapa de avaliação:
 *   "01 - AV1", "02 - AV2", "03 - AV3", "04 - BÔNUS TRI",
 *   "05 - MÉDIA", "06 - REC PARALELA TRI", "07 - MÉDIA TRIMESTRAL"
 * Muitas vêm sem NOTA quando o aluno não realizou aquela avaliação.
 *
 * Recuperação final / média final anual: a sentença testada não trouxe essas
 * etapas para o RA de exemplo (aluno sem necessidade de recuperação). O
 * parser abaixo já reconhece os padrões prováveis ("REC FINAL", "MÉDIA
 * FINAL") e preenche os campos quando aparecerem; enquanto não aparecerem,
 * ficam `null` e a UI exibe "—" (ver DisciplinaBoletim.recuperacaoFinal/mediaFinal).
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
  | "REC_FINAL"
  | "MEDIA_FINAL"
  | "OUTRO";

const DESCRICAO_POR_TIPO: Record<TipoEtapa, string> = {
  AV1: "Avaliação 1",
  AV2: "Avaliação 2",
  AV3: "Avaliação 3",
  BONUS: "Bônus",
  MEDIA: "Média",
  REC_PARALELA: "Recuperação Paralela",
  MEDIA_TRIMESTRAL: "Média Trimestral",
  REC_FINAL: "Recuperação Final",
  MEDIA_FINAL: "Média Final",
  OUTRO: "Outra avaliação",
};

function detectarTipoEtapa(provaBruta: string): TipoEtapa {
  const etapa = provaBruta.toUpperCase();
  // Ordem importa: "MÉDIA TRIMESTRAL" precisa ser checado antes de "MÉDIA".
  if (etapa.includes("MÉDIA FINAL") || etapa.includes("MEDIA FINAL")) return "MEDIA_FINAL";
  if (etapa.includes("REC FINAL") || etapa.includes("RECUPERAÇÃO FINAL") || etapa.includes("RECUPERACAO FINAL"))
    return "REC_FINAL";
  if (etapa.includes("MÉDIA TRIMESTRAL") || etapa.includes("MEDIA TRIMESTRAL")) return "MEDIA_TRIMESTRAL";
  if (etapa.includes("REC PARALELA")) return "REC_PARALELA";
  if (etapa.includes("BÔNUS") || etapa.includes("BONUS")) return "BONUS";
  if (etapa.includes("AV1")) return "AV1";
  if (etapa.includes("AV2")) return "AV2";
  if (etapa.includes("AV3")) return "AV3";
  if (etapa.includes("MÉDIA") || etapa.includes("MEDIA")) return "MEDIA";
  return "OUTRO";
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

    const trimestreMap = new Map<1 | 2 | 3, AvaliacaoComposicao[]>();
    let recuperacaoFinal: number | null = null;
    let mediaFinal: number | null = null;

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

      const trimestre = parseTrimestre(etapaBruta);
      if (!trimestre) continue; // etapa sem trimestre reconhecível — descartada (ex: recuperação final anual)

      if (!trimestreMap.has(trimestre)) trimestreMap.set(trimestre, []);
      trimestreMap.get(trimestre)!.push({
        etapa: provaBruta || etapaBruta,
        descricao: DESCRICAO_POR_TIPO[tipo],
        nota,
        realizada: nota !== null,
        peso: null, // TODO: sentença atual não retorna peso por avaliação
      });
    }

    const trimestres: NotaTrimestre[] = [1, 2, 3]
      .filter((t): t is 1 | 2 | 3 => trimestreMap.has(t as 1 | 2 | 3))
      .map((trimestre) => {
        const composicao = trimestreMap.get(trimestre)!;
        const linhaMedia = composicao.find((c) => c.descricao === "Média Trimestral");
        return {
          trimestre,
          mediaTrimestral: linhaMedia?.nota ?? null,
          composicao,
        };
      });

    const mediasFechadas = trimestres.map((t) => t.mediaTrimestral).filter((n): n is number => n !== null);
    const mediaAnual = mediasFechadas.length > 0 ? round1(mediasFechadas.reduce((a, b) => a + b, 0) / mediasFechadas.length) : null;
    const mediaAnualParcial = mediasFechadas.length > 0 && mediasFechadas.length < 3;

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
