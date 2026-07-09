import { Badge } from "@/components/ui/Badge";

export function FonteBadge({ fonte }: { fonte: "mock" | "totvs" }) {
  if (fonte === "totvs") {
    return <Badge tone="success">Dados reais — TOTVS RM</Badge>;
  }
  return <Badge tone="warning">Dados de demonstração (mock)</Badge>;
}
