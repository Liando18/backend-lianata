import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET: Cek status koneksi Telegram user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const [user] = await db
      .select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.id, authResult.user.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        isLinked: !!user?.telegramId,
        telegramId: user?.telegramId || null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil status Telegram." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Putuskan koneksi Telegram dari akun
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    await db
      .update(users)
      .set({ telegramId: null, updatedAt: new Date() })
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({
      success: true,
      message: "Koneksi Telegram berhasil diputuskan.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal memutuskan koneksi Telegram." },
      { status: 500 }
    );
  }
}
