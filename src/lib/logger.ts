import "server-only";

const SENSITIVE_KEYS = ["password", "senha", "secret", "token", "authorization", "cookie"];

/**
 * Mascara valores sensíveis antes de logar. Uso: logger.info("totvs call", logger.mask({ senha }))
 */
function mask(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length <= 4) return "***";
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? "***" : v,
      ])
    );
  }
  return value;
}

function format(level: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  mask,
  info(message: string, meta?: Record<string, unknown>) {
    console.log(format("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(format("error", message, meta));
  },
};
