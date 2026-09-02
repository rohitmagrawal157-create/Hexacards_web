/** Root path segments that must never resolve as a public card slug. */
export const RESERVED_ROOT_SEGMENTS = new Set([
  "product",
  "products",
  "dashboard",
  "login",
  "checkout",
  "api",
  "super-admin",
  "contact",
  "franchise",
  "services",
  "reviews",
  "order",
  "design-your-card",
  "thank-you",
  "u",
  "_next",
  "favicon.ico",
]);

export function isReservedRootSegment(segment: string): boolean {
  return RESERVED_ROOT_SEGMENTS.has(segment.trim().toLowerCase());
}
