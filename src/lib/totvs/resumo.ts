import type { BoletimAluno } from "@/lib/totvs/types";

export interface ResumoBoletim {
  totalDisciplinas: number;
  mediaGeral: number | null;
  maiorNota: { disciplina: string; valor: number } | null;
  menorNota: { disciplina: string; valor: number } | null;
  disciplinasAbaixoDaMedia: number;
}

export function calcularResumo(boletim: BoletimAluno): ResumoBoletim {
  const notasFinais = boletim.disciplinas
    .map((d) => ({ disciplina: d.disciplina, valor: d.mediaFinal ?? d.mediaAnual }))
    .filter((n): n is { disciplina: string; valor: number } => n.valor !== null);

  const mediaGeral =
    notasFinais.length > 0
      ? Math.round((notasFinais.reduce((acc, n) => acc + n.valor, 0) / notasFinais.length) * 10) / 10
      : null;

  const maiorNota = notasFinais.reduce<{ disciplina: string; valor: number } | null>(
    (max, n) => (!max || n.valor > max.valor ? n : max),
    null
  );
  const menorNota = notasFinais.reduce<{ disciplina: string; valor: number } | null>(
    (min, n) => (!min || n.valor < min.valor ? n : min),
    null
  );

  return {
    totalDisciplinas: boletim.disciplinas.length,
    mediaGeral,
    maiorNota,
    menorNota,
    disciplinasAbaixoDaMedia: boletim.disciplinas.filter((d) => d.abaixoDaMedia).length,
  };
}
