import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-border/60 text-muted",
  primary: "bg-primary-light text-primary-dark",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}
