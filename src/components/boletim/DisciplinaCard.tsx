"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DisciplinaBoletim } from "@/lib/totvs/types";

export function DisciplinaCard({ disciplina }: { disciplina: DisciplinaBoletim }) {
  const dados = [1, 2, 3].map((t) => {
    const tri = disciplina.trimestres.find((x) => x.trimestre === t);
    return { trimestre: `${t}º`, nota: tri?.mediaTrimestral ?? null };
  });

  const notaFinal = disciplina.mediaFinal ?? disciplina.mediaAnual;

  return (
    <Card className={disciplina.abaixoDaMedia ? "border-danger/40" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="heading-font text-sm font-semibold leading-snug text-foreground">
          {disciplina.disciplina}
        </h3>
        {disciplina.abaixoDaMedia && <Badge tone="danger">Abaixo do mínimo</Badge>}
      </div>

      <div className="mt-3 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <YAxis domain={[0, 10]} hide />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              formatter={(value) =>
                value === null || value === undefined ? "não fechado" : Number(value).toFixed(1)
              }
            />
            <Bar dataKey="nota" radius={[4, 4, 0, 0]} fill={disciplina.abaixoDaMedia ? "#c22b3a" : "#006fba"} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        {dados.map((d) => (
          <span key={d.trimestre}>
            {d.trimestre} {d.nota !== null ? d.nota.toFixed(1) : "—"}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs font-medium text-muted">
          Média anual{disciplina.mediaAnualParcial ? " (parcial)" : ""}
        </span>
        <span className={`heading-font text-lg font-bold ${disciplina.abaixoDaMedia ? "text-danger" : "text-foreground"}`}>
          {notaFinal !== null ? notaFinal.toFixed(1) : "—"}
        </span>
      </div>
    </Card>
  );
}
