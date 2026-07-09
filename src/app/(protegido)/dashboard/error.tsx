"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Falha ao carregar o dashboard:", error.message);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar o boletim"
      description="Houve uma falha ao consultar o sistema acadêmico. Tente novamente em instantes."
      onRetry={reset}
    />
  );
}
