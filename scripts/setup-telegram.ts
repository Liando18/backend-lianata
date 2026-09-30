/**
 * Script untuk setup Telegram Bot webhook.
 *
 * Cara pakai:
 *   npx tsx scripts/setup-telegram.ts
 *
 * Pastikan env variable berikut sudah diset:
 *   - TELEGRAM_BOT_TOKEN: Token dari @BotFather
 *   - TELEGRAM_WEBHOOK_URL: URL publik backend Anda (contoh: https://lianata.example.com)
 *   - TELEGRAM_WEBHOOK_SECRET: Secret token untuk verifikasi webhook (opsional tapi direkomendasikan)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN belum diset di .env.local");
  console.log("\nCara mendapatkan token:");
  console.log("1. Buka Telegram, cari @BotFather");
  console.log("2. Ketik /newbot");
  console.log("3. Ikuti instruksi untuk membuat bot");
  console.log("4. Copy token yang diberikan");
  console.log('5. Tambahkan ke .env.local: TELEGRAM_BOT_TOKEN=<token>');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error("❌ TELEGRAM_WEBHOOK_URL belum diset di .env.local");
  console.log("\nContoh: TELEGRAM_WEBHOOK_URL=https://lianata-backend.vercel.app");
  console.log(
    "Untuk development, gunakan ngrok: ngrok http 3000, lalu pakai URL dari ngrok."
  );
  process.exit(1);
}

async function setupTelegramBot() {
  const webhookFullUrl = `${WEBHOOK_URL}/api/webhook/telegram`;

  console.log("🤖 Setting up Lianata Telegram Bot...\n");

  // 1. Set webhook
  console.log(`📡 Setting webhook to: ${webhookFullUrl}`);

  const setWebhookBody: Record<string, string> = {
    url: webhookFullUrl,
    allowed_updates: JSON.stringify(["message"]),
  };

  if (WEBHOOK_SECRET) {
    setWebhookBody.secret_token = WEBHOOK_SECRET;
  }

  const setWebhookRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setWebhookBody),
    }
  );
  const setWebhookData = await setWebhookRes.json();

  if (setWebhookData.ok) {
    console.log("✅ Webhook berhasil diset!\n");
  } else {
    console.error("❌ Gagal set webhook:", setWebhookData);
    process.exit(1);
  }

  // 2. Set bot commands
  console.log("📋 Setting bot commands...");

  const commands = [
    { command: "start", description: "Mulai bot Lianata" },
    { command: "link", description: "Hubungkan akun: /link email@anda.com" },
    { command: "unlink", description: "Putuskan koneksi akun" },
    { command: "help", description: "Tampilkan panduan penggunaan" },
  ];

  const setCommandsRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    }
  );
  const setCommandsData = await setCommandsRes.json();

  if (setCommandsData.ok) {
    console.log("✅ Bot commands berhasil diset!\n");
  } else {
    console.error("❌ Gagal set commands:", setCommandsData);
  }

  // 3. Set bot description
  console.log("📝 Setting bot description...");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description:
        "Lianata AI - Asisten pencatat keuangan otomatis. Kirim pesan seperti 'beli kopi 25k' dan transaksi Anda akan langsung tercatat!",
    }),
  });

  console.log("✅ Bot description berhasil diset!\n");

  // 4. Get bot info
  console.log("ℹ️  Getting bot info...");

  const getMeRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
  );
  const getMeData = await getMeRes.json();

  if (getMeData.ok) {
    const bot = getMeData.result;
    console.log(`\n🎉 Bot berhasil di-setup!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Nama    : ${bot.first_name}`);
    console.log(`  Username: @${bot.username}`);
    console.log(`  Bot ID  : ${bot.id}`);
    console.log(`  Webhook : ${webhookFullUrl}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n👉 Buka https://t.me/${bot.username} untuk test bot Anda!`);
  }

  // 5. Verify webhook
  console.log("\n🔍 Verifying webhook...");
  const webhookInfoRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const webhookInfo = await webhookInfoRes.json();

  if (webhookInfo.ok) {
    const info = webhookInfo.result;
    console.log(`  URL              : ${info.url}`);
    console.log(`  Has Secret Token : ${info.has_custom_certificate || "No"}`);
    console.log(`  Pending Updates  : ${info.pending_update_count}`);
    if (info.last_error_message) {
      console.log(`  ⚠️  Last Error   : ${info.last_error_message}`);
    }
  }
}

setupTelegramBot().catch(console.error);
