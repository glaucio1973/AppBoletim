import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { NaoAutenticadoError } from "@/lib/errors";

/**
 * Data Access Layer — centraliza a verificação de autenticação.
 * Use `verifySession()` em Server Components/Pages (redireciona para /login).
 * Use `requireSession()` em Route Handlers (lança NaoAutenticadoError, sem redirect).
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session?.ra) {
    redirect("/login");
  }
  return session;
});

export const getOptionalSession = cache(async (): Promise<SessionPayload | null> => {
  return getSession();
});

/** Para Route Handlers: lança 401 em vez de redirecionar. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session?.ra) {
    throw new NaoAutenticadoError();
  }
  return session;
}
