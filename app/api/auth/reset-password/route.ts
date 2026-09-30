import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!rawPhone || rawPhone.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor WhatsApp minimal 10 digit.",
        },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Kata sandi baru minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    const cleaned = rawPhone.replace(/[^0-9]/g, "");
    const localFormat = cleaned.startsWith("62") ? "0" + cleaned.slice(2) : cleaned;
    const intlFormat = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;

    const [user] = await db
      .select({ id: users.id })
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
          message: "Nomor WhatsApp belum terdaftar di sistem.",
        },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      {
        success: true,
        message: "Kata sandi berhasil diperbarui. Silakan login kembali.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memperbarui kata sandi.",
      },
      { status: 500 }
    );
  }
}
