"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { DisciplinaBoletim } from "@/lib/totvs/types";

function formatarNota(nota: number | null): string {
  return nota === null ? "—" : nota.toFixed(1);
}

export function TabelaDetalhada({
  disciplinas,
  mediaMinima,
}: {
  disciplinas: DisciplinaBoletim[];
  mediaMinima: number;
}) {
  const [selecionada, setSelecionada] = useState<DisciplinaBoletim | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-background/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Disciplina</th>
            <th className="px-3 py-3 text-center">1º Tri</th>
            <th className="px-3 py-3 text-center">2º Tri</th>
            <th className="px-3 py-3 text-center">3º Tri</th>
            <th className="px-3 py-3 text-center">Média Anual</th>
            <th className="px-3 py-3 text-center">Rec. Final</th>
            <th className="px-3 py-3 text-center">Média Final</th>
          </tr>
        </thead>
        <tbody>
          {disciplinas.map((disciplina) => (
            <tr
              key={disciplina.disciplina}
              onClick={() => setSelecionada(disciplina)}
              className={clsx(
                "cursor-pointer border-b border-border transition hover:bg-primary-light/40",
                disciplina.abaixoDaMedia && "bg-danger-bg/40"
              )}
            >
              <td className="px-4 py-3 font-medium text-foreground">
                <span className="mr-2 inline-block w-3 text-muted">›</span>
                {disciplina.disciplina}
                {disciplina.abaixoDaMedia && (
                  <Badge tone="danger">
                    <span className="ml-1">abaixo</span>
                  </Badge>
                )}
              </td>
              {[1, 2, 3].map((t) => {
                const tri = disciplina.trimestres.find((x) => x.trimestre === t);
                return (
                  <td key={t} className="px-3 py-3 text-center tabular-nums">
                    {formatarNota(tri?.mediaTrimestral ?? null)}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center font-semibold tabular-nums">
                {formatarNota(disciplina.mediaAnual)}
                {disciplina.mediaAnualParcial && <span className="ml-1 text-[10px] text-muted">parcial</span>}
              </td>
              <td className="px-3 py-3 text-center tabular-nums text-muted">
                {formatarNota(disciplina.recuperacaoFinal)}
              </td>
              <td className="px-3 py-3 text-center font-semibold tabular-nums">
                {formatarNota(disciplina.mediaFinal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={selecionada !== null} onClose={() => setSelecionada(null)} title={selecionada?.disciplina ?? ""}>
        {selecionada && <DrilldownTrimestres disciplina={selecionada} mediaMinima={mediaMinima} />}
      </Modal>
    </div>
  );
}

function DrilldownTrimestres({
  disciplina,
  mediaMinima,
}: {
  disciplina: DisciplinaBoletim;
  mediaMinima: number;
}) {
  if (disciplina.trimestres.length === 0) {
    return <p className="text-sm text-muted">Nenhuma avaliação lançada ainda para esta disciplina.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {disciplina.trimestres.map((trimestre) => (
        <div key={trimestre.trimestre} className="rounded-xl border border-border bg-background/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {trimestre.trimestre}º Trimestre — formação da média
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-1 font-medium">Avaliação</th>
                <th className="pb-1 text-right font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {trimestre.composicao.map((item) => (
                <tr
                  key={item.etapa}
                  className={clsx(
                    "border-t border-border/60",
                    item.descricao === "Média Trimestral" && "font-semibold text-foreground"
                  )}
                >
                  <td className="py-1 pr-2 text-foreground/90">{item.descricao}</td>
                  <td className="py-1 text-right tabular-nums">
                    {item.realizada ? item.nota!.toFixed(1) : <span className="text-muted">não realizada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trimestre.mediaTrimestral !== null && trimestre.mediaTrimestral < mediaMinima && (
            <p className="mt-2 text-[11px] font-medium text-danger">Abaixo da média mínima neste trimestre.</p>
          )}
        </div>
      ))}
    </div>
  );
}
