export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect all routes except login and auth API routes
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
