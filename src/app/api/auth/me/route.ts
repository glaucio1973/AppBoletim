import { NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/dal";

export async function GET() {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    aluno: { nome: session.nome, ra: session.ra },
  });
}
