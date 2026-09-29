import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { updateTransactionSchema } from "@/lib/validations/transaction";
import { eq, and } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { id } = await params;

    const [item] = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        transactionDate: transactions.transactionDate,
        source: transactions.source,
        rawPrompt: transactions.rawPrompt,
        chatMessageId: transactions.chatMessageId,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          type: categories.type,
          icon: categories.icon,
          color: categories.color,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && item.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Transaksi ini bukan milik Anda.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat mengambil transaksi.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { id } = await params;

    const [existing] = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && existing.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Anda tidak berhak mengubah transaksi ini.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = updateTransactionSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          success: false,
          message: issues[0] || "Data pembaruan tidak valid.",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parseResult.data.type !== undefined) {
      updates.type = parseResult.data.type;
    }

    if (parseResult.data.amount !== undefined) {
      updates.amount = parseResult.data.amount.toFixed(2);
    }

    if (parseResult.data.description !== undefined) {
      updates.description = parseResult.data.description;
    }

    if (parseResult.data.categoryId !== undefined) {
      if (parseResult.data.categoryId) {
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, parseResult.data.categoryId))
          .limit(1);

        if (!cat) {
          return NextResponse.json(
            {
              success: false,
              message: "Kategori yang dipilih tidak ditemukan.",
            },
            { status: 404 }
          );
        }
      }
      updates.categoryId = parseResult.data.categoryId;
    }

    if (parseResult.data.transactionDate !== undefined) {
      updates.transactionDate = new Date(parseResult.data.transactionDate);
    }

    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Transaksi berhasil diperbarui.",
        data: updated,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memperbarui transaksi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { id } = await params;

    const [existing] = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && existing.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Anda tidak berhak menghapus transaksi ini.",
        },
        { status: 403 }
      );
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    return NextResponse.json(
      {
        success: true,
        message: "Transaksi berhasil dihapus.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat menghapus transaksi.",
      },
      { status: 500 }
    );
  }
}
