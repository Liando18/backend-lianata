import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { chatSessions, chatMessages, transactions, categories } from "@/db/schema";
import { sendChatMessageSchema } from "@/lib/validations/chat";
import { parseWithAI } from "@/lib/ai/openrouter";
import { eq, or, and, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const body = await request.json();
    const parseResult = sendChatMessageSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          success: false,
          message: issues[0] || "Data pesan tidak valid.",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const { sessionId, message } = parseResult.data;

    let activeSessionId = sessionId;

    if (activeSessionId) {
      const [session] = await db
        .select({ id: chatSessions.id, userId: chatSessions.userId })
        .from(chatSessions)
        .where(eq(chatSessions.id, activeSessionId))
        .limit(1);

      if (!session || session.userId !== user.id) {
        activeSessionId = null;
      }
    }

    if (!activeSessionId) {
      const title =
        message.length > 30 ? `${message.substring(0, 30)}...` : message;

      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId: user.id,
          title,
        })
        .returning();

      activeSessionId = newSession.id;
    }

    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: activeSessionId,
        userId: user.id,
        sender: "user",
        content: message,
        status: "pending",
      })
      .returning();

    const availableCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
      })
      .from(categories)
      .where(
        or(isNull(categories.userId), eq(categories.userId, user.id))
      );

    const aiResult = await parseWithAI(message, availableCategories);

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
          userId: user.id,
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

    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: activeSessionId,
        userId: user.id,
        sender: "assistant",
        content: aiResult.reply,
        status: "none",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: activeSessionId,
          userMessage,
          assistantMessage,
          transaction: createdTransaction,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memproses pesan chat.",
      },
      { status: 500 }
    );
  }
}
