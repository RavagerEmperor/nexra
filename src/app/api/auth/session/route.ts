import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Cookie'den session oku — otomatik giriş için
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("nexra_session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ ok: false, authenticated: false });
  }

  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie, "base64url").toString("utf-8"));

    // Session süre kontrolü (7 gün)
    if (sessionData.ts && Date.now() - sessionData.ts > 7 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ ok: false, authenticated: false, error: "session_expired" });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: sessionData.id,
        email: sessionData.email,
        name: sessionData.name,
        picture: sessionData.picture,
        provider: sessionData.provider,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, authenticated: false, error: "invalid_session" });
  }
}
