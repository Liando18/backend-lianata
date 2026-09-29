import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { id } = await params;

    const [session] = await db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi percakapan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && session.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Sesi ini bukan milik Anda.",
        },
        { status: 403 }
      );
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        userId: chatMessages.userId,
        sender: chatMessages.sender,
        content: chatMessages.content,
        parsedData: chatMessages.parsedData,
        status: chatMessages.status,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, id))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json(
      {
        success: true,
        data: {
          session,
          messages,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memuat pesan sesi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { id } = await params;

    const [session] = await db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi percakapan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && session.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Anda tidak berhak menghapus sesi ini.",
        },
        { status: 403 }
      );
    }

    await db.delete(chatSessions).where(eq(chatSessions.id, id));

    return NextResponse.json(
      {
        success: true,
        message: "Sesi percakapan berhasil dihapus.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat menghapus sesi chat.",
      },
      { status: 500 }
    );
  }
}
