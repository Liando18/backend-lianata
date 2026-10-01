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

    let currentUser = user;
    if (!currentUser) {
      const generatedEmail = `wa_${cleaned}@lianata.app`;
      const [existingByEmail] = await db
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
        .where(eq(users.email, generatedEmail))
        .limit(1);

      if (existingByEmail) {
        currentUser = existingByEmail;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            name: `Pengguna ${cleaned.slice(-4)}`,
            email: generatedEmail,
            phone: rawPhone,
            passwordHash: "$2b$10$wT0q3jUv1E47iE.kG75RmeoF6386x0Ua3536yG8z2N3O5iJ5n45",
            role: "user",
            isActive: true,
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
            avatarUrl: users.avatarUrl,
            isActive: users.isActive,
          });
        currentUser = newUser;
      }
    }

    if (!currentUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda dinonaktifkan. Silakan hubungi dukungan pelanggan.",
        },
        { status: 403 }
      );
    }

    const accessToken = await signAccessToken({
      sub: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
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
      userId: currentUser.id,
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
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            role: currentUser.role,
            avatarUrl: currentUser.avatarUrl,
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
        message: "Terjadi kesalahan internal saat memproses autentikasi WhatsApp.",
      },
      { status: 500 }
    );
  }
}
