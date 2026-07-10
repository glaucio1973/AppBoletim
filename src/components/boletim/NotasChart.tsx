"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DisciplinaBoletim } from "@/lib/totvs/types";
import { EmptyState } from "@/components/ui/EmptyState";

const CORES_TRIMESTRE = ["#006fba", "#3fa9e0", "#ffe938"];
// Largura fixa por disciplina: com muitas disciplinas o gráfico vira scroll
// horizontal em vez de espremer todas as barras na largura da tela (ruim
// principalmente no celular).
const LARGURA_POR_DISCIPLINA = 100;
const LIMIAR_DICA_SCROLL = 6;

export function NotasChart({
  disciplinas,
  mediaMinima,
}: {
  disciplinas: DisciplinaBoletim[];
  mediaMinima: number;
}) {
  // Disciplinas sem nenhuma nota lançada em nenhum trimestre não agregam
  // informação ao comparativo — só ocupam espaço com barras vazias.
  const disciplinasComNota = disciplinas.filter((d) =>
    d.trimestres.some((t) => t.mediaTrimestral !== null)
  );

  if (disciplinasComNota.length === 0) {
    return (
      <EmptyState
        title="Sem notas lançadas ainda"
        description="Assim que o primeiro trimestre for fechado, o comparativo aparece aqui."
      />
    );
  }

  const dados = disciplinasComNota.map((d) => {
    const linha: Record<string, string | number | null> = {
      disciplina: abreviar(d.disciplina),
    };
    for (const t of d.trimestres) {
      linha[`${t.trimestre}º Tri`] = t.mediaTrimestral;
    }
    return linha;
  });

  const largura = disciplinasComNota.length * LARGURA_POR_DISCIPLINA;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="h-80" style={{ width: largura, minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="disciplina"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
              />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                y={mediaMinima}
                stroke="#c22b3a"
                strokeDasharray="6 4"
                label={{
                  value: `Mínimo ${mediaMinima.toFixed(1)}`,
                  fontSize: 11,
                  fill: "#c22b3a",
                  position: "insideTopRight",
                }}
              />
              {["1º Tri", "2º Tri", "3º Tri"].map((chave, i) => (
                <Bar key={chave} dataKey={chave} fill={CORES_TRIMESTRE[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {disciplinasComNota.length > LIMIAR_DICA_SCROLL && (
        <p className="mt-1 text-center text-[11px] text-muted">
          ← arraste para o lado para ver todas as disciplinas →
        </p>
      )}
    </div>
  );
}

function abreviar(nome: string): string {
  return nome.length > 18 ? `${nome.slice(0, 17)}…` : nome;
}
