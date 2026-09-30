import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/auth/token";
import { eq, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!rawPhone || rawPhone.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor WhatsApp minimal 10 digit.",
        },
        { status: 400 }
      );
    }

    const cleaned = rawPhone.replace(/[^0-9]/g, "");
    const localFormat = cleaned.startsWith("62") ? "0" + cleaned.slice(2) : cleaned;
    const intlFormat = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;

    const [user] = await db
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
      .where(
        or(
          eq(users.phone, rawPhone),
          eq(users.phone, cleaned),
          eq(users.phone, localFormat),
          eq(users.phone, intlFormat)
        )
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor WhatsApp belum terdaftar di sistem. Silakan lakukan pendaftaran terlebih dahulu.",
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda dinonaktifkan. Silakan hubungi dukungan pelanggan.",
        },
        { status: 403 }
      );
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const tokenHash = await hashToken(refreshToken);

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "127.0.0.1";

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Login via WhatsApp berhasil.",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          tokens: {
            accessToken,
            refreshToken,
            tokenType: "Bearer",
            expiresIn: 3600,
          },
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memproses autentikasi WhatsApp.",
      },
      { status: 500 }
    );
  }
}
