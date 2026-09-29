import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/token";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const isAuthRoute =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register");

  const rateLimitConfig = isAuthRoute
    ? { limit: 15, windowMs: 60000, key: `auth_${ip}` }
    : { limit: 120, windowMs: 60000, key: `api_${ip}` };

  const rateLimitResult = checkRateLimit(
    rateLimitConfig.key,
    rateLimitConfig.limit,
    rateLimitConfig.windowMs
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimitResult.resetInMs / 1000).toString(),
        },
      }
    );
  }

  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutatingMethods.includes(request.method)) {
    const authHeader = request.headers.get("authorization");
    const hasBearer = authHeader && authHeader.startsWith("Bearer ");

    if (!hasBearer && request.cookies.has("token")) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return NextResponse.json(
              { success: false, message: "Akses ditolak: Potensi serangan CSRF terdeteksi." },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, message: "Akses ditolak: Origin tidak valid." },
            { status: 403 }
          );
        }
      }
    }
  }

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    return response;
  }

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  if (pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      token = request.cookies.get("token")?.value ?? null;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Token tidak ditemukan" },
        { status: 401, headers: corsHeaders }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Memerlukan hak akses Admin" },
        { status: 403, headers: corsHeaders }
      );
    }
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
