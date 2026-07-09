import "server-only";

/**
 * Estado em memória do IdP falso de desenvolvimento (src/app/api/dev/fake-layers/*).
 * Não usar em produção — reinicia a cada deploy/restart, é só para permitir testar
 * o fluxo completo (login → callback → dashboard) sem credenciais reais da Layers.
 */
export interface FakePerfilAluno {
  nome: string;
  email: string;
  ra: string;
}

const codesToProfile = new Map<string, FakePerfilAluno>();
const tokensToProfile = new Map<string, FakePerfilAluno>();

export function registerFakeCode(code: string, profile: FakePerfilAluno) {
  codesToProfile.set(code, profile);
}

export function consumeFakeCode(code: string): FakePerfilAluno | undefined {
  const profile = codesToProfile.get(code);
  codesToProfile.delete(code);
  return profile;
}

export function registerFakeToken(token: string, profile: FakePerfilAluno) {
  tokensToProfile.set(token, profile);
}

export function getProfileByToken(token: string): FakePerfilAluno | undefined {
  return tokensToProfile.get(token);
}
