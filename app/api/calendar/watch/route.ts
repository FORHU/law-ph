import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { refreshGoogleAccessToken } from "@/lib/google-token";

export async function POST(req: Request) {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { webhookUrl, providerToken } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing webhookUrl." }, { status: 400 });
    }

    let googleAccessToken = user.googleAccessToken || providerToken;

    if (!googleAccessToken) {
      return NextResponse.json({ error: "Missing Google provider token." }, { status: 400 });
    }

    // Skip Google Watch if running on localhost (Google requires HTTPS)
    if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
      return NextResponse.json({
        success: true,
        message: "Skipping Google Watch API on localhost (HTTPS required for webhooks).",
      });
    }

    const channelId = crypto.randomUUID();

    const watchUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch";
    const makeWatchRequest = (token: string) => fetch(watchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: channelId, type: "web_hook", address: webhookUrl }),
    });

    let response = await makeWatchRequest(googleAccessToken);

    if (response.status === 401 && user.googleRefreshToken) {
      const refreshedToken = await refreshGoogleAccessToken(user.googleRefreshToken);
      if (refreshedToken) {
        googleAccessToken = refreshedToken;
        await prisma.user.update({
          where: { id: user.id },
          data: { googleAccessToken },
        });
        response = await makeWatchRequest(googleAccessToken);
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Watch API error:", errorData);
      return NextResponse.json({ error: "Failed to create watch channel", details: errorData }, { status: response.status });
    }

    const watchData = await response.json();

    // Remove previous channels for this user, then insert the new one
    await prisma.calendarWatchChannel.deleteMany({ where: { userId: user.id } });

    await prisma.calendarWatchChannel.create({
      data: {
        channelId,
        resourceId: watchData.resourceId ?? "",
        userId: user.id,
        expiration: watchData.expiration ? BigInt(watchData.expiration) : BigInt(0),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully registered calendar webhook watch.",
      watchData,
      channelId,
    });
  } catch (error) {
    console.error("Watch API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
