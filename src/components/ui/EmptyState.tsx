import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon ?? <div className="text-4xl">🗂️</div>}
      <h3 className="heading-font text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
    </div>
  );
}
