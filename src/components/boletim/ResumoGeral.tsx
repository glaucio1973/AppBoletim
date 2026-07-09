import { Card } from "@/components/ui/Card";
import type { ResumoBoletim } from "@/lib/totvs/resumo";

export function ResumoGeral({ resumo, mediaMinima }: { resumo: ResumoBoletim; mediaMinima: number }) {
  const itens = [
    {
      label: "Média geral",
      valor: resumo.mediaGeral !== null ? resumo.mediaGeral.toFixed(1) : "—",
      destaque: resumo.mediaGeral !== null && resumo.mediaGeral < mediaMinima,
    },
    {
      label: "Maior nota",
      valor: resumo.maiorNota ? resumo.maiorNota.valor.toFixed(1) : "—",
      sub: resumo.maiorNota?.disciplina,
    },
    {
      label: "Menor nota",
      valor: resumo.menorNota ? resumo.menorNota.valor.toFixed(1) : "—",
      sub: resumo.menorNota?.disciplina,
    },
    {
      label: "Disciplinas abaixo da média",
      valor: String(resumo.disciplinasAbaixoDaMedia),
      destaque: resumo.disciplinasAbaixoDaMedia > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {itens.map((item) => (
        <Card key={item.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
          <p className={`heading-font mt-1 text-3xl font-bold ${item.destaque ? "text-danger" : "text-foreground"}`}>
            {item.valor}
          </p>
          {item.sub && <p className="mt-1 truncate text-xs text-muted">{item.sub}</p>}
        </Card>
      ))}
    </div>
  );
}
