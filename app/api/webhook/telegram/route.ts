import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { processChatMessage } from "@/lib/ai/chat-processor";
import { eq, or } from "drizzle-orm";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// ============================================
// Helper: Kirim pesan ke Telegram
// ============================================
async function sendTelegramMessage(chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

// ============================================
// Helper: Cari user berdasarkan Telegram ID
// ============================================
async function findUserByTelegramId(telegramId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      telegramId: users.telegramId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  return user;
}

// ============================================
// Helper: Link Telegram ke akun via kode OTP/email
// ============================================
async function linkTelegramAccount(telegramId: string, email: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, telegramId: users.telegramId })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    return { success: false, message: "Email tidak ditemukan di sistem Lianata." };
  }

  if (user.telegramId && user.telegramId !== telegramId) {
    return {
      success: false,
      message: "Akun ini sudah terhubung dengan Telegram lain.",
    };
  }

  if (user.telegramId === telegramId) {
    return {
      success: false,
      message: `Akun Anda (${user.name}) sudah terhubung! Langsung kirim pesan untuk mencatat transaksi.`,
    };
  }

  await db
    .update(users)
    .set({ telegramId, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return {
    success: true,
    message: `✅ Berhasil menghubungkan Telegram ke akun *${user.name}*!\n\nSekarang Anda bisa langsung mencatat transaksi.\n\nContoh:\n• "beli kopi 25k"\n• "gajian 5jt"\n• "bayar listrik 500rb"`,
  };
}

// ============================================
// POST: Terima webhook dari Telegram
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Verifikasi webhook secret (opsional)
    if (TELEGRAM_WEBHOOK_SECRET) {
      const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
      if (secretHeader && secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
        console.error("[Telegram Webhook] Secret mismatch");
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("[Telegram Webhook] TELEGRAM_BOT_TOKEN not set");
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const message = body.message;

    // Hanya proses pesan teks biasa
    if (!message?.text || !message?.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const telegramId = message.from.id.toString();
    const firstName = message.from.first_name || "User";

    console.log(`[Telegram] Pesan dari ${firstName} (${telegramId}): ${text}`);

    // ─────────────────────────────────────────
    // Handle /start command
    // ─────────────────────────────────────────
    if (text === "/start") {
      const existingUser = await findUserByTelegramId(telegramId);

      if (existingUser) {
        await sendTelegramMessage(
          chatId,
          `👋 Halo kembali, *${existingUser.name}*!\n\n` +
            `Saya Lianata AI, asisten keuangan Anda.\n\n` +
            `Langsung kirim pesan untuk mencatat transaksi:\n` +
            `• "beli kopi 25k"\n` +
            `• "gajian 5jt"\n` +
            `• "bayar listrik 500rb"\n\n` +
            `Ketik /help untuk bantuan lebih lanjut.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 Halo ${firstName}! Saya *Lianata AI*.\n\n` +
            `Saya bisa mencatat keuangan Anda otomatis lewat chat!\n\n` +
            `⚠️ Anda perlu menghubungkan akun Lianata terlebih dahulu.\n\n` +
            `Ketik perintah berikut:\n` +
            `\`/link email@anda.com\`\n\n` +
            `Ganti dengan email yang Anda gunakan saat daftar di aplikasi Lianata.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────
    // Handle /link command (hubungkan akun)
    // ─────────────────────────────────────────
    if (text.startsWith("/link ")) {
      const email = text.substring(6).trim();

      if (!email || !email.includes("@")) {
        await sendTelegramMessage(
          chatId,
          `❌ Format salah.\n\nGunakan: \`/link email@anda.com\``
        );
        return NextResponse.json({ ok: true });
      }

      const result = await linkTelegramAccount(telegramId, email);
      await sendTelegramMessage(chatId, result.message);
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────
    // Handle /unlink command (putuskan koneksi)
    // ─────────────────────────────────────────
    if (text === "/unlink") {
      const user = await findUserByTelegramId(telegramId);
      if (!user) {
        await sendTelegramMessage(chatId, "❌ Akun Telegram Anda belum terhubung.");
        return NextResponse.json({ ok: true });
      }

      await db
        .update(users)
        .set({ telegramId: null, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await sendTelegramMessage(
        chatId,
        "✅ Akun Telegram berhasil diputuskan dari Lianata.\n\n" +
          "Ketik `/link email@anda.com` untuk menghubungkan kembali."
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────
    // Handle /help command
    // ─────────────────────────────────────────
    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📖 *Panduan Lianata Bot*\n\n` +
          `*Catat Pengeluaran:*\n` +
          `• "beli kopi 25k"\n` +
          `• "makan siang 35rb"\n` +
          `• "bayar listrik 500000"\n\n` +
          `*Catat Pemasukan:*\n` +
          `• "gajian 5jt"\n` +
          `• "terima bonus 1,5jt"\n` +
          `• "dapat freelance 2jt"\n\n` +
          `*Perintah:*\n` +
          `• /start - Mulai bot\n` +
          `• /link email - Hubungkan akun\n` +
          `• /unlink - Putuskan koneksi\n` +
          `• /help - Tampilkan bantuan\n\n` +
          `💡 Semua transaksi otomatis tersinkron ke aplikasi Lianata!`
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────
    // Proses pesan biasa (catat transaksi)
    // ─────────────────────────────────────────
    const user = await findUserByTelegramId(telegramId);

    if (!user) {
      await sendTelegramMessage(
        chatId,
        `❌ Akun Telegram belum terhubung.\n\n` +
          `Hubungkan dulu dengan:\n` +
          `\`/link email@anda.com\`\n\n` +
          `Gunakan email yang terdaftar di aplikasi Lianata.`
      );
      return NextResponse.json({ ok: true });
    }

    if (!user.isActive) {
      await sendTelegramMessage(chatId, "❌ Akun Anda sedang nonaktif. Hubungi admin.");
      return NextResponse.json({ ok: true });
    }

    // Proses dengan shared AI chat processor
    const result = await processChatMessage(user.id, text);

    // Kirim balasan ke Telegram
    await sendTelegramMessage(chatId, result.aiResult.reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook Error]", error);
    // Tetap return 200 agar Telegram tidak retry terus-menerus
    return NextResponse.json({ ok: true });
  }
}

// ============================================
// GET: Verifikasi endpoint aktif (health check)
// ============================================
export async function GET() {
  return NextResponse.json({
    ok: true,
    bot: "Lianata Telegram Bot",
    status: "active",
  });
}
