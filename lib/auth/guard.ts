import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, TokenPayload } from "./token";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "admin" | "user";
  avatarUrl: string | null;
}

export type AuthResult =
  | { user: AuthenticatedUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse };

export async function authenticateRequest(
  request: NextRequest,
  allowedRoles?: ("admin" | "user")[]
): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    token = request.cookies.get("token")?.value ?? null;
  }

  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Token otentikasi tidak ditemukan. Harap login terlebih dahulu.",
        },
        { status: 401 }
      ),
    };
  }

  const payload: TokenPayload | null = await verifyAccessToken(token);

  if (!payload) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Sesi tidak valid atau telah kedaluwarsa.",
        },
        { status: 401 }
      ),
    };
  }

  const [existingUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!existingUser || !existingUser.isActive) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Akun tidak ditemukan atau telah dinonaktifkan.",
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(existingUser.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      role: existingUser.role,
      avatarUrl: existingUser.avatarUrl,
    },
    errorResponse: null,
  };
}
