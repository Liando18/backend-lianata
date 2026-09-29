import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { hashToken } from "@/lib/auth/token";
import { authenticateRequest } from "@/lib/auth/guard";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    let refreshToken: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.refreshToken === "string") {
        refreshToken = body.refreshToken;
      }
    } catch {
      refreshToken = null;
    }

    if (refreshToken) {
      const tokenHash = await hashToken(refreshToken);
      await db
        .update(sessions)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(sessions.tokenHash, tokenHash));
    } else {
      await db
        .update(sessions)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(sessions.userId, authResult.user.id));
    }

    return NextResponse.json(
      {
        success: true,
        message: "Logout berhasil. Sesi telah dinonaktifkan.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal server saat memproses logout.",
      },
      { status: 500 }
    );
  }
}
