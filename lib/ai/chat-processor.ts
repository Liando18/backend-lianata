import "server-only";

import { db } from "@/db";
import {
  chatSessions,
  chatMessages,
  transactions,
  categories,
} from "@/db/schema";
import { parseWithAI, ParsedFinancialResult } from "@/lib/ai/openrouter";
import { eq, or, isNull, desc } from "drizzle-orm";

export interface ChatProcessorResult {
  sessionId: string;
  userMessage: typeof chatMessages.$inferSelect;
  assistantMessage: typeof chatMessages.$inferSelect;
  transaction: typeof transactions.$inferSelect | null;
  aiResult: ParsedFinancialResult;
}

/**
 * Proses pesan chat dan buat transaksi otomatis jika terdeteksi.
 * Fungsi ini digunakan bersama oleh:
 * - /api/chat (in-app chat)
 * - /api/webhook/whatsapp (WhatsApp via Fonnte)
 * - /api/webhook/telegram (Telegram Bot)
 */
export async function processChatMessage(
  userId: string,
  message: string,
  sessionId?: string | null
): Promise<ChatProcessorResult> {
  // 1. Cari/buat chat session
  let activeSessionId = sessionId || null;

  if (activeSessionId) {
    const [session] = await db
      .select({ id: chatSessions.id, userId: chatSessions.userId })
      .from(chatSessions)
      .where(eq(chatSessions.id, activeSessionId))
      .limit(1);

    if (!session || session.userId !== userId) {
      activeSessionId = null;
    }
  }

  if (!activeSessionId) {
    // Cari session terakhir user atau buat baru
    const [existingSession] = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1);

    if (existingSession) {
      activeSessionId = existingSession.id;
    } else {
      const title =
        message.length > 30 ? `${message.substring(0, 30)}...` : message;

      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId,
          title,
        })
        .returning();

      activeSessionId = newSession.id;
    }
  }

  // 2. Simpan pesan user
  const [userMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId: activeSessionId,
      userId,
      sender: "user",
      content: message,
      status: "pending",
    })
    .returning();

  // 3. Ambil kategori yang tersedia
  const availableCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
    })
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));

  // 4. Proses dengan AI
  const aiResult = await parseWithAI(message, availableCategories);

  // 5. Buat transaksi jika terdeteksi
  let createdTransaction = null;

  if (aiResult.isTransaction && aiResult.amount && aiResult.type) {
    let matchedCategoryId: string | null = null;
    if (aiResult.category) {
      const found = availableCategories.find(
        (c) =>
          c.name.toLowerCase() === aiResult.category!.toLowerCase() &&
          c.type === aiResult.type
      );
      if (found) {
        matchedCategoryId = found.id;
      } else {
        const fallbackCat = availableCategories.find(
          (c) => c.type === aiResult.type
        );
        if (fallbackCat) {
          matchedCategoryId = fallbackCat.id;
        }
      }
    }

    const [newTx] = await db
      .insert(transactions)
      .values({
        userId,
        categoryId: matchedCategoryId,
        type: aiResult.type,
        amount: aiResult.amount.toFixed(2),
        description: aiResult.description || message,
        transactionDate: new Date(),
        source: "ai_chat",
        chatMessageId: userMessage.id,
        rawPrompt: message,
      })
      .returning();

    createdTransaction = newTx;

    await db
      .update(chatMessages)
      .set({
        status: "processed",
        parsedData: {
          isTransaction: true,
          type: aiResult.type,
          amount: aiResult.amount,
          description: aiResult.description,
          category: aiResult.category,
          transactionId: newTx.id,
        },
      })
      .where(eq(chatMessages.id, userMessage.id));
  } else {
    await db
      .update(chatMessages)
      .set({
        status: "none",
        parsedData: {
          isTransaction: false,
        },
      })
      .where(eq(chatMessages.id, userMessage.id));
  }

  // 6. Simpan response AI
  const [assistantMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId: activeSessionId,
      userId,
      sender: "assistant",
      content: aiResult.reply,
      status: "none",
    })
    .returning();

  return {
    sessionId: activeSessionId,
    userMessage,
    assistantMessage,
    transaction: createdTransaction,
    aiResult,
  };
}
