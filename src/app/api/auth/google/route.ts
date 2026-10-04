// NextAuth Google OAuth route.
// Real Google login requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env
// + callback URL registered in Google Cloud Console (https://console.cloud.google.com/apis/credentials).
// Callback URL must be: https://YOUR_DOMAIN/api/auth/callback/google
//
// If credentials are missing, the route returns a clear error and the UI falls back
// to the demo Google account picker (operator can still test the flow).

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function hasCredentials() {
  return (
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID.length > 10
  );
}

function getRedirectUri(req: NextRequest) {
  // Allow explicit override via env (for Vercel production)
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  // Support NextAuth-style NEXTAUTH_URL
  if (process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  // VERCEL_URL (auto-set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
  }
  // Fallback: derive from request
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}/api/auth/google/callback`;
}

// Step 1: redirect to Google consent screen
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "login";

  if (!hasCredentials()) {
    return NextResponse.json(
      {
        ok: false,
        error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env degiskenleri ayarli degil.",
        hint: "Google Cloud Console'dan OAuth 2.0 client ID olustur, .env'e ekle, callback URL'i kaydet.",
        fallback: "demo",
      },
      { status: 503 }
    );
  }

  if (action === "login") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: getRedirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  }

  if (action === "callback") {
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(new URL("/?google_error=no_code", req.url));
    }
    try {
      // exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: getRedirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) {
        return NextResponse.redirect(new URL("/?google_error=token", req.url));
      }

      // fetch user info
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userRes.json();

      // return profile as JSON (client will store it)
      // In production you'd set an httpOnly cookie here via NextAuth.
      const profile = {
        sub: user.sub,
        email: user.email,
        name: user.name,
        givenName: user.given_name,
        familyName: user.family_name,
        picture: user.picture,
        locale: user.locale,
        verifiedEmail: user.email_verified,
      };
      // redirect to frontend with profile encoded
      const enc = encodeURIComponent(JSON.stringify(profile));
      return NextResponse.redirect(new URL(`/?google_profile=${enc}`, req.url));
    } catch {
      return NextResponse.redirect(new URL("/?google_error=exception", req.url));
    }
  }

  return NextResponse.json({ ok: false, error: "bilinmeyen action" }, { status: 400 });
}

// POST: used by client to check if real Google is available
export async function POST() {
  return NextResponse.json({
    ok: hasCredentials(),
    configured: hasCredentials(),
    message: hasCredentials()
      ? "real google oauth hazir"
      : "credential yok — demo modu kullan",
  });
}
