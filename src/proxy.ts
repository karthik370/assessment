import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// proxy.ts — replaces the deprecated middleware.ts
// Next.js 16 runs this on the Node.js runtime (not Edge), so Prisma works fine.
// Auth docs: https://authjs.dev/getting-started/session-management/protecting

export async function proxy(request: NextRequest) {
  const session = await auth();

  // Already on the login page — don't redirect
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // Not authenticated — send to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except static assets, images, favicon, and auth routes
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
