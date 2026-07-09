import { NextResponse } from "next/server";
import { requireSession } from "@/lib/dal";
import { getBoletimAluno } from "@/lib/totvs/totvsService";
import { AppError, AlunoSemRAError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * Único ponto de entrada do frontend para dados de notas — nunca fala com a
 * TOTVS diretamente. O RA usado é sempre o resolvido pela sessão autenticada
 * (nunca aceito via query/body do cliente), evitando que um usuário consulte
 * o boletim de outro aluno.
 */
export async function GET() {
  try {
    const session = await requireSession();

    // Fallback para o RA fixo apenas enquanto a Layers real (com RA garantido
    // no userinfo) não estiver em produção — ver TOTVS_RA_PADRAO em .env.example.
    const ra = session.ra || env.TOTVS_RA_PADRAO;
    if (!ra) {
      throw new AlunoSemRAError();
    }

    const boletim = await getBoletimAluno(ra);
    return NextResponse.json(boletim);
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn("api.boletim erro de negócio", { code: error.code });
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode });
    }
    logger.error("api.boletim erro inesperado", { message: (error as Error).message });
    return NextResponse.json(
      { error: "ERRO_INESPERADO", message: "Ocorreu um erro inesperado ao buscar o boletim." },
      { status: 500 }
    );
  }
}
