import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getRedirectUri(req: NextRequest) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  if (process.env.NEXTAUTH_URL) return `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=no_code", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getRedirectUri(req);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?auth_error=no_credentials", req.url));
  }

  // Token exchange
  let tokens: any = null;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return NextResponse.redirect(new URL("/?auth_error=token_exchange_failed", req.url));
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/?auth_error=no_access_token", req.url));
  }

  // Get user info
  let userInfo: any = null;
  try {
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    userInfo = await userRes.json();
  } catch (e) {
    return NextResponse.redirect(new URL("/?auth_error=userinfo_failed", req.url));
  }

  if (!userInfo.sub) {
    return NextResponse.redirect(new URL("/?auth_error=no_user", req.url));
  }

  // Create session token (base64 encoded JSON — production'da JWT + secret kullan)
  const sessionData = {
    id: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    provider: "google",
    ts: Date.now(),
  };

  // Session'ı hem cookie hem URL param olarak geç
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64url");

  const res = NextResponse.redirect(new URL(state, req.url));
  res.cookies.set("nexra_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 gün
    path: "/",
  });

  return res;
}
