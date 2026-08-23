const FOCUSED_CHILD_ROUTE_PATTERNS = [
  /^\/child\/games(?:\/|$)/,
  /^\/child\/learning\/[^/]+\/lesson\/[^/]+(?:\/|$)/,
  /^\/child\/stories\/[^/]+(?:\/|$)/,
]

export const shouldSuppressBackgroundMusic = (pathname: string): boolean =>
  FOCUSED_CHILD_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))
