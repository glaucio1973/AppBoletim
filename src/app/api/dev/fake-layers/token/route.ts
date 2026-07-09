import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { env, isDev } from "@/lib/env";
import { consumeFakeCode, registerFakeToken } from "@/lib/layers/devFakeStore";

export async function POST(request: NextRequest) {
  if (!isDev || !env.LAYERS_FAKE_IDP) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.formData();
  const code = String(body.get("code") ?? "");
  const profile = consumeFakeCode(code);

  if (!profile) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const accessToken = randomUUID();
  registerFakeToken(accessToken, profile);

  return NextResponse.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
  });
}
