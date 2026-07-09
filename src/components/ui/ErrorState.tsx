"use client";

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger-bg px-6 py-16 text-center">
      <div className="text-4xl">⚠️</div>
      <h3 className="heading-font text-lg font-semibold text-danger">{title}</h3>
      {description && <p className="max-w-md text-sm text-danger/90">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-liessin mt-2 bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
