import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email-service";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Find the user — always respond with success to avoid enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 3600000); // 1 hour
    
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: token, otpExpiry: expiry }
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetLink = `${siteUrl}/auth/update-password?token=${token}`;

    const htmlBody = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.name || 'User'},</p>
      <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #722f37; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser: <br/> ${resetLink}</p>
      <p>This link will expire in 1 hour.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Reset your ilovelawyer password",
      body: htmlBody,
      siteUrl,
    });
    
    console.log(`[forgot-password] Reset requested for ${email}`);
  }

  return NextResponse.json({ success: true });
}
