export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NaoAutenticadoError extends AppError {
  constructor(message = "Sessão inválida ou expirada.") {
    super(message, 401, "NAO_AUTENTICADO");
  }
}

export class AlunoSemRAError extends AppError {
  constructor(message = "Não foi possível identificar o RA do aluno autenticado.") {
    super(message, 422, "ALUNO_SEM_RA");
  }
}

export class TotvsIndisponivelError extends AppError {
  constructor(message = "O sistema acadêmico (TOTVS) está indisponível no momento.") {
    super(message, 502, "TOTVS_INDISPONIVEL");
  }
}

export class LayersAuthError extends AppError {
  constructor(message = "Falha na autenticação com a Layers.") {
    super(message, 401, "LAYERS_AUTH_ERROR");
  }
}
