import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE = "auth-token";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  username: string;
  role: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  avatarId: string | null;
};

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      isEmailVerified: true,
      onboardingCompleted: true,
      avatarId: true,
    },
  });

  return user;
}
