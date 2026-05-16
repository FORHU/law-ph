import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Find the user — always respond with success to avoid enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // TODO: generate a reset token, store it, and send an email
    console.log(`[forgot-password] Reset requested for ${email}`);
  }

  return NextResponse.json({ success: true });
}
