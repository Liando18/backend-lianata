import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { createSessionSchema } from "@/lib/validations/chat";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;

    const sessions = await db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        messageCount: sql<number>`(select count(*)::int from chat_messages where session_id = ${chatSessions.id})`,
      })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(desc(chatSessions.updatedAt));

    return NextResponse.json(
      {
        success: true,
        data: sessions,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memuat daftar sesi chat.",
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
    const body = await request.json().catch(() => ({}));
    const parseResult = createSessionSchema.safeParse(body);

    const title =
      parseResult.success && parseResult.data.title
        ? parseResult.data.title
        : "Percakapan Baru";

    const [newSession] = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        title,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Sesi percakapan berhasil dibuat.",
        data: newSession,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat membuat sesi chat.",
      },
      { status: 500 }
    );
  }
}
