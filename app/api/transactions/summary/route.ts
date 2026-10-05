import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const url = new URL(request.url);

    const targetUserId =
      user.role === "admin" && url.searchParams.get("userId")
        ? url.searchParams.get("userId")!
        : user.id;

    const conditions = [eq(transactions.userId, targetUserId)];

    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

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

    const whereClause = and(...conditions);

    const [summary] = await db
      .select({
        totalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)::text`,
        totalExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)::text`,
        incomeCount: sql<number>`count(case when ${transactions.type} = 'income' then 1 end)::int`,
        expenseCount: sql<number>`count(case when ${transactions.type} = 'expense' then 1 end)::int`,
        totalCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(whereClause);

    const totalIncome = parseFloat(summary.totalIncome);
    const totalExpense = parseFloat(summary.totalExpense);
    const netBalance = totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? Math.min(100, Math.max(0, (netBalance / totalIncome) * 100)) : 0;

    const allTx = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(whereClause)
      .orderBy(transactions.transactionDate);

    let running = 0;
    const history: number[] = [];
    for (const t of allTx) {
      const amt = parseFloat(t.amount);
      running += t.type === "income" ? amt : -amt;
      history.push(running);
    }

    let trendPoints: number[] = [0, 0, 0, 0, 0, 0, 0];
    if (history.length > 0) {
      if (history.length < 7) {
        trendPoints = [...Array(7 - history.length).fill(0), ...history];
      } else {
        const step = (history.length - 1) / 6;
        trendPoints = [];
        for (let i = 0; i < 6; i++) {
          const idx = Math.min(Math.round(i * step), history.length - 1);
          trendPoints.push(history[idx]);
        }
        trendPoints.push(history[history.length - 1]);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          totalIncome,
          totalExpense,
          netBalance,
          incomeCount: summary.incomeCount,
          expenseCount: summary.expenseCount,
          totalCount: summary.totalCount,
          savingsRatio,
          trendPoints,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat menghitung ringkasan transaksi.",
      },
      { status: 500 }
    );
  }
}
