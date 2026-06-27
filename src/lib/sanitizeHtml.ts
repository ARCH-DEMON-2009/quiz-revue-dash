import DOMPurify from "dompurify";

/**
 * The TNC CRM returns question/option/explanation text peppered with legacy
 * inline markup (`<font>`, `<span style=...>`, `&nbsp;`, etc.). Rendering it as
 * plain text leaks raw tags into the UI, so we sanitize it to a safe subset and
 * render it as real HTML.
 */
export function cleanHtml(input: string | null | undefined): string {
  if (!input) return "";
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "sub", "sup", "br", "p", "span", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th"],
    ALLOWED_ATTR: [],
  });
  return sanitized;
}

/** Strip all HTML and collapse whitespace — used for PDF export and meta tags. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  const withBreaks = input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr)\s*>/gi, "\n");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  const text = doc.body.textContent ?? "";
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
