import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { refreshTokenSchema } from "@/lib/auth/validation";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/auth/token";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = refreshTokenSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: "Refresh token tidak valid." },
        { status: 400 }
      );
    }

    const { refreshToken } = parseResult.data;
    const incomingTokenHash = await hashToken(refreshToken);

    const [existingSession] = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        isRevoked: sessions.isRevoked,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.tokenHash, incomingTokenHash))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi tidak ditemukan atau token tidak valid.",
        },
        { status: 401 }
      );
    }

    if (existingSession.isRevoked) {
      await db
        .update(sessions)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(sessions.userId, existingSession.userId));

      return NextResponse.json(
        {
          success: false,
          message:
            "Keamanan terancam: Token kedaluwarsa telah digunakan ulang. Semua sesi telah dicabut demi keamanan akun Anda. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    if (existingSession.expiresAt < now) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi telah kedaluwarsa. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, existingSession.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Akun pengguna tidak aktif." },
        { status: 403 }
      );
    }

    await db
      .update(sessions)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(eq(sessions.id, existingSession.id));

    const newAccessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken();
    const newHash = await hashToken(newRefreshToken);

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "127.0.0.1";

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: newHash,
      userAgent,
      ipAddress,
      expiresAt: newExpiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Token berhasil diperbarui",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: "Bearer",
          expiresIn: 3600,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal server saat memperbarui token.",
      },
      { status: 500 }
    );
  }
}
