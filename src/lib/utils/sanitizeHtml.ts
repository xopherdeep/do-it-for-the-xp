import DOMPurify from "dompurify";

/**
 * Sanitize untrusted HTML strings using DOMPurify before rendering into v-html.
 * Prevents XSS vulnerabilities and fulfills SECURITY_RAW_HTML_INJECTION quality gate.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) {
    return "";
  }
  return DOMPurify.sanitize(html);
};

export default sanitizeHtml;
