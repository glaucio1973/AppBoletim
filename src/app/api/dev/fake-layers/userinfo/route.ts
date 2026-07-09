import { NextRequest, NextResponse } from "next/server";
import { env, isDev } from "@/lib/env";
import { getProfileByToken } from "@/lib/layers/devFakeStore";

export async function GET(request: NextRequest) {
  if (!isDev || !env.LAYERS_FAKE_IDP) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const profile = getProfileByToken(token);

  if (!profile) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  return NextResponse.json({
    sub: profile.ra,
    name: profile.nome,
    email: profile.email,
    ra: profile.ra,
  });
}
