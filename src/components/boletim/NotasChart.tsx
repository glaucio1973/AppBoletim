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

const CORES_TRIMESTRE = ["#006fba", "#3fa9e0", "#ffe938"];

export function NotasChart({
  disciplinas,
  mediaMinima,
}: {
  disciplinas: DisciplinaBoletim[];
  mediaMinima: number;
}) {
  const dados = disciplinas.map((d) => {
    const linha: Record<string, string | number | null> = {
      disciplina: abreviar(d.disciplina),
    };
    for (const t of d.trimestres) {
      linha[`${t.trimestre}º Tri`] = t.mediaTrimestral;
    }
    return linha;
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="disciplina"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
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
            label={{ value: `Mínimo ${mediaMinima.toFixed(1)}`, fontSize: 11, fill: "#c22b3a", position: "insideTopRight" }}
          />
          {["1º Tri", "2º Tri", "3º Tri"].map((chave, i) => (
            <Bar key={chave} dataKey={chave} fill={CORES_TRIMESTRE[i]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function abreviar(nome: string): string {
  return nome.length > 14 ? `${nome.slice(0, 13)}…` : nome;
}
