import type { LinhaCuboNotas } from "@/lib/totvs/types";

/**
 * Gera linhas cruas no MESMO formato validado da sentença CUBO.07 real, para
 * permitir desenvolver e demonstrar o app sem depender de rede/credenciais.
 * Usado quando TOTVS_MODE=mock (padrão).
 */
const DISCIPLINAS: { nome: string; ordem: number }[] = [
  { nome: "LÍNGUA PORTUGUESA", ordem: 1 },
  { nome: "MATEMÁTICA", ordem: 2 },
  { nome: "HISTÓRIA", ordem: 3 },
  { nome: "GEOGRAFIA", ordem: 4 },
  { nome: "CIÊNCIAS", ordem: 5 },
  { nome: "REDAÇÃO", ordem: 6 },
  { nome: "INGLÊS", ordem: 7 },
  { nome: "EDUCAÇÃO FÍSICA", ordem: 8 },
  { nome: "ARTE", ordem: 9 },
  { nome: "HEBRAICO", ordem: 10 },
];

const ETAPAS_TRIMESTRE = [
  "01 - AV1",
  "02 - AV2",
  "03 - AV3",
  "04 - BÔNUS TRI",
  "05 - MÉDIA",
  "06 - REC PARALELA TRI",
  "07 - MÉDIA TRIMESTRAL",
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function gerarNotaEtapa(rand: () => number, tipoEtapa: string, baseDisciplina: number): string | undefined {
  if (tipoEtapa === "06 - REC PARALELA TRI") {
    // nem todo aluno faz recuperação paralela — simula ausência na maior parte dos casos
    return rand() > 0.75 ? (5 + rand() * 3).toFixed(1) : undefined;
  }
  if (tipoEtapa === "04 - BÔNUS TRI") {
    return rand() > 0.5 ? (rand() * 0.5).toFixed(1) : undefined;
  }
  const variacao = (rand() - 0.5) * 2.5;
  const nota = Math.min(10, Math.max(0, baseDisciplina + variacao));
  return nota.toFixed(1);
}

export function gerarNotasMock(ra: string, periodoLetivo: string): LinhaCuboNotas[] {
  const rand = seedRandom(Number(ra) || 1);
  const linhas: LinhaCuboNotas[] = [];
  const nomeAluno = "Aluno Exemplo (dados mockados)";
  const turma = "9º A";
  const serie = "9º ANO";

  for (const disciplina of DISCIPLINAS) {
    // média-base por disciplina, para variar quem fica acima/abaixo do mínimo
    const baseDisciplina = 5.5 + rand() * 4;

    for (let trimestre = 1 as 1 | 2 | 3; trimestre <= 3; trimestre = (trimestre + 1) as 1 | 2 | 3) {
      const notasEtapas: Record<string, string | undefined> = {};
      for (const etapa of ETAPAS_TRIMESTRE) {
        if (etapa === "07 - MÉDIA TRIMESTRAL" || etapa === "05 - MÉDIA") continue;
        notasEtapas[etapa] = gerarNotaEtapa(rand, etapa, baseDisciplina);
      }

      const avaliacoesValidas = ["01 - AV1", "02 - AV2", "03 - AV3"]
        .map((e) => Number(notasEtapas[e]))
        .filter((n) => Number.isFinite(n));
      const bonus = Number(notasEtapas["04 - BÔNUS TRI"] ?? 0) || 0;
      const media = avaliacoesValidas.length
        ? Math.min(10, avaliacoesValidas.reduce((a, b) => a + b, 0) / avaliacoesValidas.length + bonus)
        : 0;
      const recPar = Number(notasEtapas["06 - REC PARALELA TRI"]);
      const mediaTrimestral = Number.isFinite(recPar) ? Math.max(media, recPar) : media;

      notasEtapas["05 - MÉDIA"] = media.toFixed(1);
      notasEtapas["07 - MÉDIA TRIMESTRAL"] = mediaTrimestral.toFixed(1);

      for (const etapa of ETAPAS_TRIMESTRE) {
        const nota = notasEtapas[etapa];
        linhas.push({
          NOME: nomeAluno,
          DISCIPLINA: disciplina.nome,
          ETAPA: `0${trimestre} - ${trimestre}º TRI`,
          PROVA: etapa,
          NOTA: nota,
          CODPERLET: periodoLetivo,
          CODTURMA: turma,
          SERIE: serie,
          ORDEM: String(disciplina.ordem),
          RA: ra,
        });
      }
    }
  }

  return linhas;
}
