import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function POST() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { googleRefreshToken: true },
  });

  if (!dbUser?.googleRefreshToken) {
    return NextResponse.json({ error: "No refresh token — user must reconnect Google" }, { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: dbUser.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.access_token) {
    console.error("[google/refresh] Token refresh failed:", data);
    return NextResponse.json({ error: data.error ?? "Refresh failed" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { googleAccessToken: data.access_token },
  });

  return NextResponse.json({ access_token: data.access_token });
}
