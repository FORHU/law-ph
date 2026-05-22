import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { password, token } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  let userId = null;

  if (token) {
    // Password reset flow
    const user = await prisma.user.findFirst({
      where: {
        otpCode: token,
        otpExpiry: { gt: new Date() }
      }
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }
    userId = user.id;
    // Clear the token and update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, otpCode: null, otpExpiry: null }
    });
  } else {
    // Logged-in user flow
    const sessionUser = await getServerSession();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = sessionUser.id;
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  }

  return NextResponse.json({ success: true });
}
