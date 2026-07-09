/** Uma linha crua retornada pela sentença CUBO.07 (formato confirmado em testes reais). */
export interface LinhaCuboNotas {
  NOME?: string;
  DISCIPLINA?: string;
  /** Marca o trimestre da linha, ex: "01 - 1º TRI". */
  ETAPA?: string;
  /** Marca o tipo de avaliação dentro do trimestre, ex: "01 - AV1", "07 - MÉDIA TRIMESTRAL". */
  PROVA?: string;
  NOTA?: string;
  CODPERLET?: string;
  CODTURMA?: string;
  SERIE?: string;
  ORDEM?: string;
  RA?: string;
  [coluna: string]: unknown;
}

export interface AvaliacaoComposicao {
  /** Código bruto da etapa, ex: "01 - AV1", "07 - MÉDIA TRIMESTRAL" */
  etapa: string;
  /** Rótulo amigável para exibição, ex: "Avaliação 1", "Média Trimestral" */
  descricao: string;
  nota: number | null;
  realizada: boolean;
  /** Peso da avaliação na composição da média, quando disponível na fonte de dados. */
  peso: number | null;
}

export interface NotaTrimestre {
  trimestre: 1 | 2 | 3;
  mediaTrimestral: number | null;
  composicao: AvaliacaoComposicao[];
}

export interface DisciplinaBoletim {
  disciplina: string;
  ordem: number;
  trimestres: NotaTrimestre[];
  mediaAnual: number | null;
  mediaAnualParcial: boolean;
  /** TODO: aguardando confirmação de que ETAPA de recuperação final é retornada pela sentença. */
  recuperacaoFinal: number | null;
  /** TODO: aguardando confirmação de que ETAPA de média final é retornada pela sentença. */
  mediaFinal: number | null;
  abaixoDaMedia: boolean;
}

export interface BoletimAluno {
  aluno: {
    nome: string;
    ra: string;
    turma?: string;
    serie?: string;
  };
  anoLetivo: string;
  mediaMinima: number;
  disciplinas: DisciplinaBoletim[];
  geradoEm: string;
  fonte: "mock" | "totvs";
}
