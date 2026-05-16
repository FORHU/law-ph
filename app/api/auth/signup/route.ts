import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { email, password, name, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: username || email.split("@")[0] }] },
    });

    if (existing) {
      return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const finalUsername = username || email.split("@")[0];

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        username: finalUsername,
      },
    });

    const token = await signToken({ userId: user.id });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    }, { status: 201 });

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("[api/auth/signup]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
