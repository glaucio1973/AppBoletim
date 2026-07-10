import { getBoletimDoAlunoAtual } from "@/lib/boletimData";
import { calcularResumo } from "@/lib/totvs/resumo";
import { ResumoGeral } from "@/components/boletim/ResumoGeral";
import { NotasChart } from "@/components/boletim/NotasChart";
import { DisciplinaCard } from "@/components/boletim/DisciplinaCard";
import { FonteBadge } from "@/components/boletim/FonteBadge";
import { EmptyState } from "@/components/ui/EmptyState";

// Server Component: roda inteiramente no servidor Next.js. O navegador nunca
// fala com a TOTVS — só recebe o HTML/JSON já processado por aqui.
export default async function DashboardPage() {
  const boletim = await getBoletimDoAlunoAtual();
  const resumo = calcularResumo(boletim);

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
        <h2 className="heading-font text-2xl font-bold text-foreground">Boletim Gráfico</h2>
        <FonteBadge fonte={boletim.fonte} />
      </div>

      <ResumoGeral resumo={resumo} mediaMinima={boletim.mediaMinima} />

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="heading-font mb-4 text-base font-semibold text-foreground">
          Comparativo por trimestre
        </h3>
        <NotasChart disciplinas={boletim.disciplinas} mediaMinima={boletim.mediaMinima} />
      </div>

      <div>
        <h3 className="heading-font mb-3 text-base font-semibold text-foreground">Disciplinas</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boletim.disciplinas.map((disciplina) => (
            <DisciplinaCard key={disciplina.disciplina} disciplina={disciplina} />
          ))}
        </div>
      </div>
    </div>
  );
}
