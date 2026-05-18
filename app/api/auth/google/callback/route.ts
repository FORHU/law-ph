import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE } from "@/lib/auth/session";

async function getUniqueUsername(base: string): Promise<string> {
  const clean = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
  let username = clean;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${clean}${Math.floor(Math.random() * 9000) + 1000}`;
  }
  return username;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=google_denied`);
  }

  try {
    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const { access_token, refresh_token } = await tokenRes.json();

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      throw new Error(`User info fetch failed: ${userRes.status}`);
    }

    const googleUser: GoogleUserInfo = await userRes.json();

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.id,
          provider: "google",
          isEmailVerified: true,
          lastLoginAt: new Date(),
          googleAccessToken: access_token,
        },
      });
    } else {
      const username = await getUniqueUsername(googleUser.email.split("@")[0]);
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          username,
          googleId: googleUser.id,
          provider: "google",
          isEmailVerified: true,
          lastLoginAt: new Date(),
          googleAccessToken: access_token,
        },
      });
    }

    const token = await signToken({ userId: user.id });
    const res = NextResponse.redirect(`${siteUrl}/consultation`);

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("[api/auth/google/callback]", err);
    return NextResponse.redirect(`${siteUrl}/auth/login?error=google_auth_failed`);
  }
}
