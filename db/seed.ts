import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { users, categories, transactions, chatSessions, chatMessages } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const sql = neon(connectionString);
const db = drizzle(sql, { schema });

async function seed() {
  const defaultPassword = "password123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Admin Lianata",
      email: "admin@lianata.com",
      passwordHash,
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  const [regularUser] = await db
    .insert(users)
    .values({
      name: "Aprilian User",
      email: "user@lianata.com",
      passwordHash,
      role: "user",
    })
    .onConflictDoNothing()
    .returning();

  const activeUser =
    regularUser ||
    (await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "user@lianata.com"),
    }));

  const defaultCategories = [
    { name: "Gaji", type: "income" as const, icon: "payments", color: "#4CAF50" },
    { name: "Bonus", type: "income" as const, icon: "card_giftcard", color: "#8BC34A" },
    { name: "Investasi", type: "income" as const, icon: "trending_up", color: "#009688" },
    { name: "Penjualan", type: "income" as const, icon: "storefront", color: "#00BCD4" },
    { name: "Pemasukan Lain", type: "income" as const, icon: "savings", color: "#607D8B" },
    { name: "Makanan & Minuman", type: "expense" as const, icon: "restaurant", color: "#FF5722" },
    { name: "Transportasi", type: "expense" as const, icon: "directions_car", color: "#FF9800" },
    { name: "Belanja", type: "expense" as const, icon: "shopping_cart", color: "#E91E63" },
    { name: "Tagihan & Utilitas", type: "expense" as const, icon: "receipt_long", color: "#9C27B0" },
    { name: "Hiburan", type: "expense" as const, icon: "movie", color: "#673AB7" },
    { name: "Kesehatan", type: "expense" as const, icon: "medical_services", color: "#F44336" },
    { name: "Pengeluaran Lain", type: "expense" as const, icon: "money_off", color: "#795548" },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  if (activeUser) {
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: activeUser.id,
        title: "Catatan Keuangan Harian",
      })
      .returning();

    if (session) {
      const [msg1] = await db
        .insert(chatMessages)
        .values({
          sessionId: session.id,
          userId: activeUser.id,
          sender: "user",
          content: "tadi saya baru nerima gaji 3,5jt",
          parsedData: {
            amount: 3500000,
            type: "income",
            category: "Gaji",
            description: "Gaji bulanan",
            confidence: 0.98,
          },
          status: "processed",
        })
        .returning();

      await db.insert(chatMessages).values({
        sessionId: session.id,
        userId: activeUser.id,
        sender: "assistant",
        content:
          "Berhasil mencatat uang masuk sebesar Rp 3.500.000 dengan kategori Gaji.",
        status: "none",
      });

      await db.insert(transactions).values({
        userId: activeUser.id,
        type: "income",
        amount: "3500000.00",
        description: "Gaji diterima",
        source: "ai_chat",
        chatMessageId: msg1.id,
        rawPrompt: "tadi saya baru nerima gaji 3,5jt",
      });

      const [msg2] = await db
        .insert(chatMessages)
        .values({
          sessionId: session.id,
          userId: activeUser.id,
          sender: "user",
          content: "hari ini saya beli kopi 25k",
          parsedData: {
            amount: 25000,
            type: "expense",
            category: "Makanan & Minuman",
            description: "Beli kopi",
            confidence: 0.95,
          },
          status: "processed",
        })
        .returning();

      await db.insert(chatMessages).values({
        sessionId: session.id,
        userId: activeUser.id,
        sender: "assistant",
        content:
          "Berhasil mencatat uang keluar sebesar Rp 25.000 untuk Beli kopi (Makanan & Minuman).",
        status: "none",
      });

      await db.insert(transactions).values({
        userId: activeUser.id,
        type: "expense",
        amount: "25000.00",
        description: "Beli kopi",
        source: "ai_chat",
        chatMessageId: msg2.id,
        rawPrompt: "hari ini saya beli kopi 25k",
      });

      await db.insert(transactions).values({
        userId: activeUser.id,
        type: "expense",
        amount: "15000.00",
        description: "Bensin motor",
        source: "manual",
      });
    }
  }
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
