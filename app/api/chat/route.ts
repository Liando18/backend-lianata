import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";
import { sendChatMessageSchema } from "@/lib/validations/chat";
import { processChatMessage } from "@/lib/ai/chat-processor";

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

    // Gunakan shared chat processor
    const result = await processChatMessage(user.id, message, sessionId);

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: result.sessionId,
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          transaction: result.transaction,
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
