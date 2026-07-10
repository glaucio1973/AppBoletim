import { getBoletimDoAlunoAtual } from "@/lib/boletimData";
import { TabelaDetalhada } from "@/components/boletim/TabelaDetalhada";
import { FonteBadge } from "@/components/boletim/FonteBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function BoletimDetalhadoPage() {
  const boletim = await getBoletimDoAlunoAtual();

  if (boletim.disciplinas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma nota encontrada"
        description="Ainda não há notas lançadas para este aluno no período letivo atual."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading-font text-2xl font-bold text-foreground">Tabela Detalhada</h2>
          <p className="text-sm text-muted">
            Clique em uma disciplina para ver como a média de cada trimestre foi formada.
          </p>
        </div>
        <FonteBadge fonte={boletim.fonte} />
      </div>

      <TabelaDetalhada disciplinas={boletim.disciplinas} mediaMinima={boletim.mediaMinima} />
    </div>
  );
}
