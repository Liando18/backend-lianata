import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "@/lib/validations/transaction";
import { eq, and, desc, gte, lte, ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const url = new URL(request.url);

    const rawParams = {
      type: url.searchParams.get("type") || undefined,
      categoryId: url.searchParams.get("categoryId") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: url.searchParams.get("page") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    };

    const queryResult = transactionQuerySchema.safeParse(rawParams);
    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parameter query tidak valid.",
          errors: queryResult.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { type, categoryId, startDate, endDate, search, page, limit } =
      queryResult.data;

    const targetUserId =
      user.role === "admin" && url.searchParams.get("userId")
        ? url.searchParams.get("userId")!
        : user.id;

    const conditions = [eq(transactions.userId, targetUserId)];

    if (type) {
      conditions.push(eq(transactions.type, type));
    }

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        conditions.push(gte(transactions.transactionDate, parsedStart));
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        conditions.push(lte(transactions.transactionDate, parsedEnd));
      }
    }

    if (search && search.trim().length > 0) {
      conditions.push(ilike(transactions.description, `%${search.trim()}%`));
    }

    const whereClause = and(...conditions);
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause);

    const total = countResult ? countResult.count : 0;
    const totalPages = Math.ceil(total / limit);

    const data = await db
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
      .where(whereClause)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat mengambil data transaksi.",
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
    const parseResult = createTransactionSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          success: false,
          message: issues[0] || "Data transaksi tidak valid.",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const {
      type,
      amount,
      description,
      categoryId,
      transactionDate,
      source,
      rawPrompt,
    } = parseResult.data;

    if (categoryId) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Kategori yang dipilih tidak ditemukan.",
          },
          { status: 404 }
        );
      }
    }

    const dateToUse = transactionDate ? new Date(transactionDate) : new Date();

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId: user.id,
        categoryId: categoryId || null,
        type,
        amount: amount.toFixed(2),
        description,
        transactionDate: dateToUse,
        source,
        rawPrompt: rawPrompt || null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Transaksi berhasil dicatat.",
        data: newTransaction,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat menyimpan transaksi.",
      },
      { status: 500 }
    );
  }
}
