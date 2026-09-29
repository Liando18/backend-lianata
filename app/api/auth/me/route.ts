import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: authResult.user,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data profil pengguna.",
      },
      { status: 500 }
    );
  }
}
