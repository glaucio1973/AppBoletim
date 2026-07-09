"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function BoletimDetalhadoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao carregar a tabela detalhada:", error.message);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar a tabela"
      description="Houve uma falha ao consultar o sistema acadêmico. Tente novamente em instantes."
      onRetry={reset}
    />
  );
}
