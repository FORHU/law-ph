import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect") || "/consultation";
  const state = Buffer.from(JSON.stringify({ redirect })).toString("base64");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent", // forces refresh_token to be returned every login
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
