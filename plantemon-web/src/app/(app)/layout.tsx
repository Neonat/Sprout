import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * Auth boundary for every game screen.
 *
 * This is a resource-based check rather than path matching in the proxy.
 * Clerk deprecated createRouteMatcher for exactly this reason: a matcher
 * pattern can drift from how Next actually routes a request, silently leaving
 * a protected screen reachable. Gating here means the check lives with the
 * thing it protects.
 *
 * The route group keeps URLs unchanged — /garden is still /garden.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <>{children}</>;
}
