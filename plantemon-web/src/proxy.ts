import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Attaches Clerk's auth context to every request.
 *
 * Deliberately does no route protection. Authorization is enforced where the
 * protected data actually lives — src/app/(app)/layout.tsx for the screens and
 * an auth() check in each API route — so there is no matcher pattern that can
 * drift out of step with Next's routing.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the signature is
 * unchanged. The proxy runtime is always Node.js.
 */
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files, unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
