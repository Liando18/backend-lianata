import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { loginSchema } from "@/lib/auth/validation";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/auth/token";
import { eq, or } from "drizzle-orm";

const DUMMY_HASH =
  "$2a$12$e8kZ1qXw6mX5g4f6d7s8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          success: false,
          message: issues[0] || "Data login tidak valid",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const identifier = email.trim();
    const isEmail = identifier.includes("@");

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        passwordHash: users.passwordHash,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        isEmail
          ? eq(users.email, identifier.toLowerCase())
          : or(
              eq(users.phone, identifier),
              eq(users.email, identifier.toLowerCase())
            )
      )
      .limit(1);

    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Email/nomor handphone atau kata sandi yang Anda masukkan salah.",
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda telah dinonaktifkan. Hubungi administrator.",
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
        message: "Login berhasil",
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
            expiresIn: 2592000,
          },
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal server saat memproses login.",
      },
      { status: 500 }
    );
  }
}
