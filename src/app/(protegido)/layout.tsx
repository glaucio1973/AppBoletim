import { verifySession } from "@/lib/dal";
import { getBoletimDoAlunoAtual } from "@/lib/boletimData";
import { Header } from "@/components/layout/Header";

export default async function ProtegidoLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  // Busca best-effort: se a TOTVS falhar aqui, o cabeçalho cai para nome/RA da
  // sessão Layers (sem turma/série) e o erro real aparece no error.tsx da
  // página — a mesma chamada é memoizada por request (ver src/lib/boletimData.ts),
  // então isso não dispara uma segunda consulta à TOTVS.
  const boletim = await getBoletimDoAlunoAtual().catch(() => null);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header
        nome={boletim?.aluno.nome ?? session.nome}
        ra={session.ra}
        turma={boletim?.aluno.turma}
        serie={boletim?.aluno.serie}
        anoLetivo={boletim?.anoLetivo}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
