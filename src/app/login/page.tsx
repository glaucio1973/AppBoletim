import Link from "next/link";
import { env } from "@/lib/env";

const MENSAGENS_ERRO: Record<string, string> = {
  login_cancelado: "O login foi cancelado. Tente novamente quando estiver pronto.",
  state_invalido: "Sua sessão de login expirou ou é inválida. Tente novamente.",
  sem_ra: "Não conseguimos identificar sua matrícula (RA) junto à Layers. Procure a secretaria.",
  falha_autenticacao: "Não foi possível concluir a autenticação com a Layers. Tente novamente em instantes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const mensagemErro = error ? MENSAGENS_ERRO[error] ?? "Ocorreu um erro ao entrar. Tente novamente." : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-primary-light to-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[4px_12px] bg-primary text-lg font-bold text-white">
            L
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Colégio Liessin</p>
            <h1 className="heading-font text-xl font-semibold text-foreground">AppBoletim</h1>
          </div>
        </div>

        <h2 className="heading-font text-lg font-semibold text-foreground">Acesse seu boletim</h2>
        <p className="mt-1 text-sm text-muted">
          Entre com sua conta institucional da Layers para visualizar suas notas trimestrais.
        </p>

        {mensagemErro && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
            {mensagemErro}
          </div>
        )}

        {env.LAYERS_FAKE_IDP && (
          <div className="mt-4 rounded-lg border border-accent-dark/30 bg-[color:var(--accent)]/20 px-4 py-3 text-xs text-accent-dark">
            Modo de desenvolvimento: o login usa um IdP simulado (LAYERS_FAKE_IDP=true), não a Layers real.
          </div>
        )}

        <Link
          href="/api/auth/layers/login"
          className="btn-liessin mt-6 flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Entrar com Layers
        </Link>

        <p className="mt-6 text-center text-xs text-muted">
          Problemas para acessar? Procure a secretaria do Colégio Liessin.
        </p>
      </div>
    </div>
  );
}
