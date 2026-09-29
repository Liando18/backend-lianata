import "server-only";

export interface ParsedFinancialResult {
  isTransaction: boolean;
  type?: "income" | "expense";
  amount?: number;
  description?: string;
  category?: string;
  reply: string;
}

const ALLOWED_AI_HOST = "openrouter.ai";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function parseWithAI(
  userText: string,
  availableCategories: { name: string; type: "income" | "expense" }[]
): Promise<ParsedFinancialResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  if (!apiKey) {
    return parseWithFallback(userText);
  }

  const endpointUrl = new URL(OPENROUTER_ENDPOINT);
  if (endpointUrl.protocol !== "https:" || endpointUrl.hostname !== ALLOWED_AI_HOST) {
    return parseWithFallback(userText);
  }

  const categoryListStr = availableCategories
    .map((c) => `${c.name} (${c.type})`)
    .join(", ");

  const systemPrompt = `Kamu adalah asisten pencatat keuangan cerdas untuk LianataFinance.
Tugasmu adalah menganalisis pesan pengguna dan mengekstrak transaksi pemasukan (income) atau pengeluaran (expense).
Kategori yang tersedia: ${categoryListStr}.

Aturan penting:
1. Jika pesan berupa uang masuk atau keluar, ekstraksi:
   - "type": "income" (untuk gaji, bonus, terima uang, penjualan, dll) atau "expense" (untuk beli, belanja, bayar, dll).
   - "amount": angka integer murni (contoh: 25k -> 25000, 3,5jt -> 3500000, 50rb -> 50000).
   - "description": ringkasan singkat kegiatan (contoh: "Beli kopi", "Gaji bulanan").
   - "category": pilih nama kategori yang paling sesuai dari daftar kategori di atas.
   - "reply": konfirmasi ramah dalam bahasa Indonesia yang menyatakan transaksi berhasil dicatat.
2. Jika pesan BUKAN transaksi keuangan (contoh salam, tanya fitur), kembalikan isTransaction: false dan berikan balasan ramah.

Kembalikan HANYA format JSON valid berikut tanpa markdown backtick:
{
  "isTransaction": boolean,
  "type": "income" | "expense",
  "amount": number,
  "description": string,
  "category": string,
  "reply": string
}`;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lianata.finance",
        "X-Title": "LianataFinance",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return parseWithFallback(userText);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent || typeof rawContent !== "string") {
      return parseWithFallback(userText);
    }

    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    if (parsed.isTransaction && typeof parsed.amount === "number" && parsed.amount > 0) {
      return {
        isTransaction: true,
        type: parsed.type === "income" ? "income" : "expense",
        amount: Math.round(parsed.amount),
        description: parsed.description || "Transaksi Tanpa Judul",
        category: parsed.category || "Lain-lain",
        reply:
          parsed.reply ||
          `Berhasil mencatat ${parsed.type === "income" ? "uang masuk" : "uang keluar"} sebesar Rp ${parsed.amount.toLocaleString("id-ID")}.`,
      };
    }

    return {
      isTransaction: false,
      reply:
        parsed.reply ||
        "Halo! Saya asisten keuangan LianataFinance. Anda bisa mencatat transaksi cukup dengan mengetik seperti 'beli kopi 25k' atau 'gaji 3,5jt'.",
    };
  } catch {
    return parseWithFallback(userText);
  }
}

function parseWithFallback(text: string): ParsedFinancialResult {
  const lower = text.toLowerCase();

  const isIncome =
    lower.includes("gaji") ||
    lower.includes("nerima") ||
    lower.includes("dapat") ||
    lower.includes("terima") ||
    lower.includes("bonus") ||
    lower.includes("masuk") ||
    lower.includes("penjualan");

  const isExpense =
    lower.includes("beli") ||
    lower.includes("bayar") ||
    lower.includes("keluar") ||
    lower.includes("makan") ||
    lower.includes("ongkos") ||
    lower.includes("jajan") ||
    lower.includes("belanja");

  let multiplier = 1;
  let rawNumStr = "";

  const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
  const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu)/);
  const rpMatch = lower.match(/(?:rp\.?|rp\s*)(\d+(?:[.,]\d+)?)/);
  const pureNumMatch = lower.match(/\b\d{4,}\b/);

  if (jtMatch) {
    rawNumStr = jtMatch[1];
    multiplier = 1000000;
  } else if (rbMatch) {
    rawNumStr = rbMatch[1];
    multiplier = 1000;
  } else if (rpMatch) {
    rawNumStr = rpMatch[1];
    multiplier = 1;
  } else if (pureNumMatch) {
    rawNumStr = pureNumMatch[0];
    multiplier = 1;
  }

  if (rawNumStr && (isIncome || isExpense)) {
    const cleanNum = parseFloat(rawNumStr.replace(",", "."));
    const finalAmount = Math.round(cleanNum * multiplier);

    if (finalAmount > 0) {
      const type: "income" | "expense" = isIncome ? "income" : "expense";
      const desc =
        text.length > 50 ? text.substring(0, 50).trim() : text.trim();

      const categoryName = isIncome
        ? "Gaji"
        : lower.includes("kopi") || lower.includes("makan")
        ? "Makanan & Minuman"
        : lower.includes("bensin") || lower.includes("ojek") || lower.includes("grab")
        ? "Transportasi"
        : "Pengeluaran Lain";

      return {
        isTransaction: true,
        type,
        amount: finalAmount,
        description: desc,
        category: categoryName,
        reply: `Berhasil mencatat ${type === "income" ? "uang masuk" : "uang keluar"} sebesar Rp ${finalAmount.toLocaleString("id-ID")}.`,
      };
    }
  }

  return {
    isTransaction: false,
    reply:
      "Halo! Saya asisten keuangan LianataFinance. Anda bisa mencatat transaksi langsung melalui chat, seperti: 'hari ini saya beli kopi 25k' atau 'tadi saya baru nerima gaji 3,5jt'.",
  };
}
