import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { createCategorySchema } from "@/lib/validations/transaction";
import { eq, or, and, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const url = new URL(request.url);
    const typeParam = url.searchParams.get("type");

    const accessCondition = or(
      isNull(categories.userId),
      eq(categories.userId, user.id)
    );

    const conditions = [accessCondition];

    if (typeParam === "income" || typeParam === "expense") {
      conditions.push(eq(categories.type, typeParam));
    }

    const list = await db
      .select({
        id: categories.id,
        userId: categories.userId,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .where(and(...conditions));

    return NextResponse.json(
      {
        success: true,
        data: list,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memuat daftar kategori.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const body = await request.json();
    const parseResult = createCategorySchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          success: false,
          message: issues[0] || "Data kategori tidak valid.",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const { name, type, icon, color } = parseResult.data;

    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: user.role === "admin" ? null : user.id,
        name,
        type,
        icon: icon || null,
        color: color || null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Kategori berhasil dibuat.",
        data: newCategory,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat menyimpan kategori.",
      },
      { status: 500 }
    );
  }
}
