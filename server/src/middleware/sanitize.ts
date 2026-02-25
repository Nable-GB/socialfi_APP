import sanitizeHtml from "sanitize-html";

/**
 * Sanitize a string — strip all HTML tags to prevent XSS.
 * Allows only plain text (no tags, no attributes).
 */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape",
  }).trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Useful for sanitizing entire request bodies.
 */
export function sanitizeBody<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeText(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeBody) as T;
  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeBody(value);
    }
    return sanitized as T;
  }
  return obj;
}
