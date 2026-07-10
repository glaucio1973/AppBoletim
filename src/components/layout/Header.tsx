"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Boletim Gráfico" },
  { href: "/boletim/detalhado", label: "Tabela Detalhada" },
];

interface HeaderProps {
  nome: string;
  ra: string;
  turma?: string;
  serie?: string;
}

export function Header({ nome, ra, turma, serie }: HeaderProps) {
  const pathname = usePathname();
  const turmaSerie = [serie, turma].filter(Boolean).join(" · ");

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[4px_12px] bg-primary text-base font-bold text-white">
            L
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Colégio Liessin</p>
            <h1 className="heading-font text-base font-semibold leading-tight text-foreground">AppBoletim</h1>
          </div>
        </div>

        <nav className="flex gap-1 rounded-full bg-background p-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition",
                  active ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{nome}</p>
            <p className="text-xs text-muted">
              RA {ra}
              {turmaSerie && ` · ${turmaSerie}`}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="btn-liessin border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-danger/40 hover:text-danger"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
