import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { verifySession } from "@/lib/dal";
import { getBoletimAluno } from "@/lib/totvs/totvsService";
import type { BoletimAluno } from "@/lib/totvs/types";

/**
 * Busca o boletim do aluno da sessão atual, memoizado por request (React `cache`).
 * O layout (protegido)/layout.tsx e as páginas de dashboard chamam esta mesma
 * função — graças ao cache, a TOTVS só é consultada uma vez por requisição,
 * mesmo sendo chamada tanto no layout (para o cabeçalho) quanto na página.
 */
export const getBoletimDoAlunoAtual = cache(async (): Promise<BoletimAluno> => {
  const session = await verifySession();
  const ra = session.ra || env.TOTVS_RA_PADRAO;
  return getBoletimAluno(ra);
});
