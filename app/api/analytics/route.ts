import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, or, isNull, desc } from "drizzle-orm";

const ALLOWED_AI_HOST = "openrouter.ai";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface CategoryStat {
  categoryId: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

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
    const refreshAi = url.searchParams.get("refreshAi") === "true";

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

    const userTx = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        transactionDate: transactions.transactionDate,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(transactions.transactionDate));

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseCategoryMap: Record<
      string,
      {
        categoryId: string;
        name: string;
        icon: string;
        color: string;
        amount: number;
        count: number;
      }
    > = {};

    const expenseList: typeof userTx = [];

    for (const t of userTx) {
      const amt = parseFloat(t.amount);
      if (t.type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        expenseList.push(t);

        const catId = t.categoryId || "uncategorized";
        const catName = t.categoryName || "Lain-lain";
        const catIcon = t.categoryIcon || "payments";
        const catColor = t.categoryColor || "#795548";

        if (!expenseCategoryMap[catId]) {
          expenseCategoryMap[catId] = {
            categoryId: catId,
            name: catName,
            icon: catIcon,
            color: catColor,
            amount: 0,
            count: 0,
          };
        }
        expenseCategoryMap[catId].amount += amt;
        expenseCategoryMap[catId].count += 1;
      }
    }

    const netBalance = totalIncome - totalExpense;
    const savingsRatio =
      totalIncome > 0
        ? Math.min(100, Math.max(0, (netBalance / totalIncome) * 100))
        : 0;

    const burnRate =
      totalIncome > 0
        ? Math.round((totalExpense / totalIncome) * 100)
        : totalExpense > 0
        ? 100
        : 0;

    let healthScore = 100;
    if (totalIncome > 0 || totalExpense > 0) {
      if (totalExpense > totalIncome) {
        healthScore = Math.max(15, Math.round(50 - (burnRate - 100) * 0.35));
      } else if (burnRate <= 40) {
        healthScore = Math.min(100, Math.round(90 + (40 - burnRate) * 0.25));
      } else if (burnRate <= 65) {
        healthScore = Math.round(75 + (65 - burnRate) * 0.6);
      } else if (burnRate <= 85) {
        healthScore = Math.round(55 + (85 - burnRate) * 1.0);
      } else {
        healthScore = Math.max(25, Math.round(35 + (100 - burnRate) * 1.3));
      }
    }

    let statusKey: "sangat_sehat" | "sehat" | "waspada" | "boros" = "sehat";
    let statusLabel = "Keuangan Sehat";
    if (healthScore >= 85) {
      statusKey = "sangat_sehat";
      statusLabel = "Sangat Hemat & Sehat";
    } else if (healthScore >= 70) {
      statusKey = "sehat";
      statusLabel = "Arus Kas Terkendali";
    } else if (healthScore >= 50) {
      statusKey = "waspada";
      statusLabel = "Perlu Waspada";
    } else {
      statusKey = "boros";
      statusLabel = "Boros & Defisit";
    }

    const categoryBreakdown: CategoryStat[] = Object.values(
      expenseCategoryMap
    )
      .map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        type: "expense",
        icon: c.icon,
        color: c.color,
        amount: c.amount,
        percentage:
          totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
        count: c.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topExpenses = expenseList
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: parseFloat(t.amount),
        categoryName: t.categoryName || "Umum",
        date: t.transactionDate,
      }));

    let dailyAverage = 0;
    if (userTx.length > 0) {
      const dates = userTx.map((t) =>
        new Date(t.transactionDate).toISOString().split("T")[0]
      );
      const uniqueDays = new Set(dates).size;
      dailyAverage = Math.round(totalExpense / Math.max(1, uniqueDays));
    }

    let needsAmount = 0;
    let wantsAmount = 0;
    for (const c of categoryBreakdown) {
      const lower = c.name.toLowerCase();
      if (
        lower.includes("makan") ||
        lower.includes("transport") ||
        lower.includes("tagihan") ||
        lower.includes("sehat") ||
        lower.includes("obat")
      ) {
        needsAmount += c.amount;
      } else {
        wantsAmount += c.amount;
      }
    }

    const needsPct =
      totalExpense > 0 ? Math.round((needsAmount / totalExpense) * 100) : 0;
    const wantsPct =
      totalExpense > 0 ? Math.round((wantsAmount / totalExpense) * 100) : 0;
    const savingsPct = Math.round(savingsRatio);

    const topCategory = categoryBreakdown[0] || null;

    let aiEvaluation = {
      statusTitle: statusLabel,
      summary: "",
      reason: "",
      tips: [
        "Catat setiap pengeluaran kecil secara disiplin menggunakan AI Chat.",
        "Sisihkan minimal 10-20% dari setiap pemasukan untuk dana darurat.",
        "Buat pagu anggaran mingguan untuk kategori pengeluaran terbesar Anda.",
      ],
      projection: "",
    };

    if (totalExpense === 0 && totalIncome === 0) {
      aiEvaluation.summary =
        "Belum ada data transaksi yang tercatat pada periode ini.";
      aiEvaluation.reason =
        "Mulai catat transaksi pertama Anda melalui tombol Catat atau AI Chat untuk mendapatkan analisis finansial mendalam.";
      aiEvaluation.projection =
        "Kondisi buku kas masih kosong. Siap untuk pencatatan pertama!";
    } else if (totalExpense > totalIncome) {
      const def = totalExpense - totalIncome;
      aiEvaluation.summary = `Pengeluaran Anda melampaui pemasukan sebesar Rp ${def.toLocaleString(
        "id-ID"
      )} (Rasio pengeluaran: ${burnRate}%).`;
      aiEvaluation.reason = topCategory
        ? `Kategori '${topCategory.name}' menjadi pemicu utama pembengkakan dengan total Rp ${topCategory.amount.toLocaleString(
            "id-ID"
          )} (${topCategory.percentage}% dari seluruh pengeluaran).`
        : `Pengeluaran harian rata-rata mencapai Rp ${dailyAverage.toLocaleString(
            "id-ID"
          )} tanpa diimbangi arus kas masuk yang cukup.`;
      aiEvaluation.tips = [
        topCategory
          ? `Tekan pengeluaran di kategori '${topCategory.name}' minimal 25% mulai minggu ini.`
          : "Tunda pembelian barang non-esensial hingga arus kas kembali surplus.",
        "Batasi pengeluaran harian di bawah rata-rata berjalan saat ini.",
        "Prioritaskan pelunasan tagihan utama dan hindari pinjaman konsumtif.",
      ];
      aiEvaluation.projection = `Jika pola pengeluaran ini berlanjut, Anda diproyeksikan mengalami defisit kas tambahan sebesar Rp ${(
        dailyAverage * 14
      ).toLocaleString("id-ID")} dalam 2 minggu ke depan.`;
    } else {
      aiEvaluation.summary = `Arus kas Anda berada pada posisi surplus sebesar Rp ${netBalance.toLocaleString(
        "id-ID"
      )} dengan rasio tabungan ${savingsRatio.toFixed(1)}%.`;
      aiEvaluation.reason = topCategory
        ? `Pengeluaran terbesar ada pada '${topCategory.name}' sebesar ${topCategory.percentage}%, namun masih dalam batas aman arus kas masuk.`
        : "Pengeluaran Anda terkontrol dengan baik di bawah total pemasukan.";
      aiEvaluation.tips = [
        "Alokasikan surplus kas ke instrumen tabungan berimbal hasil atau deposito.",
        "Pertahankan kebiasaan mencatat transaksi tepat waktu agar rasio tabungan terjaga.",
        "Buat target pos tabungan darurat minimal setara 3-6 bulan pengeluaran rutin.",
      ];
      aiEvaluation.projection = `Dengan tren arus kas saat ini, proyeksi akumulasi tabungan Anda akan terus bertumbuh sehat.`;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey && (refreshAi || userTx.length > 0)) {
      try {
        const model = process.env.OPENROUTER_MODEL || "openrouter/free";
        const promptText = `Lakukan evaluasi kesehatan keuangan pengguna LianataFinance dalam Bahasa Indonesia.
Data:
- Total Pemasukan: Rp ${totalIncome.toLocaleString("id-ID")}
- Total Pengeluaran: Rp ${totalExpense.toLocaleString("id-ID")}
- Saldo Bersih: Rp ${netBalance.toLocaleString("id-ID")}
- Burn Rate (Pengeluaran/Pemasukan): ${burnRate}%
- Skor Kesehatan: ${healthScore}/100 (${statusLabel})
- Kategori Terbesar: ${
          topCategory
            ? `${topCategory.name} (Rp ${topCategory.amount.toLocaleString(
                "id-ID"
              )}, ${topCategory.percentage}%)`
            : "Tidak ada"
        }
- Kebutuhan: ${needsPct}%, Keinginan: ${wantsPct}%
- Rata-rata harian: Rp ${dailyAverage.toLocaleString("id-ID")}

Berikan evaluasi jujur:
1. Apakah boros/sehat?
2. Kenapa (berikan bukti konkret dari angka di atas)?
3. 3 tips aksi nyata.
4. Proyeksi singkat ke depan.

Keluarkan HANYA JSON:
{
  "statusTitle": "${statusLabel}",
  "summary": "ringkasan 1-2 kalimat",
  "reason": "alasan dan bukti konkret 1-2 kalimat",
  "tips": ["tips 1", "tips 2", "tips 3"],
  "projection": "proyeksi 1 kalimat"
}`;

        const aiRes = await fetch(OPENROUTER_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lianata.finance",
            "X-Title": "LianataFinance",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: promptText }],
            temperature: 0.2,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content;
          if (raw && typeof raw === "string") {
            let clean = raw.trim();
            if (clean.startsWith("```json")) clean = clean.substring(7);
            if (clean.startsWith("```")) clean = clean.substring(3);
            if (clean.endsWith("```"))
              clean = clean.substring(0, clean.length - 3);
            const m = clean.match(/\{[\s\S]*\}/);
            if (m) {
              const p = JSON.parse(m[0]);
              if (p.summary && Array.isArray(p.tips)) {
                aiEvaluation = {
                  statusTitle: p.statusTitle || statusLabel,
                  summary: p.summary,
                  reason: p.reason || aiEvaluation.reason,
                  tips: p.tips.slice(0, 3),
                  projection: p.projection || aiEvaluation.projection,
                };
              }
            }
          }
        }
      } catch (_) {}
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
          metrics: {
            totalIncome,
            totalExpense,
            netBalance,
            savingsRatio,
            burnRate,
            healthScore,
            statusKey,
            statusLabel,
            dailyAverage,
          },
          needsWantsSavings: {
            needsAmount,
            needsPercentage: needsPct,
            wantsAmount,
            wantsPercentage: wantsPct,
            savingsAmount: Math.max(0, netBalance),
            savingsPercentage: savingsPct,
          },
          categoryBreakdown,
          topExpenses,
          aiEvaluation,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses data analisis keuangan.",
      },
      { status: 500 }
    );
  }
}
