/**
 * Linking rules and phone device link utilities (multiplayer, MP14).
 * Link codes: 31-character alphabet without ambiguous characters (0, O, 1, I, L).
 * QR link URL generation, URL query parsing, and friendly device labeling.
 */

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/**
 * Normalizes a typed or scanned code: drops spaces, no-break spaces, and Unicode dashes.
 * Returns the uppercase 8-character code, or null when invalid.
 */
export const normalizeCode = (typed: string): string | null => {
  const isString = typeof typed === "string";
  if (!isString) return null;
  const clean = typed.replace(/[\s\-\u00A0\u2010-\u2015]+/g, "").toUpperCase();
  const shape = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);
  const isMatch = shape.test(clean);
  return isMatch ? clean : null;
};

/** Formats an 8-character code as ABCD-EFGH for readability */
export const formatCode = (code: string): string => {
  const isFull = code.length >= 4;
  return isFull ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
};

/**
 * Builds the URL for linking a phone with a code.
 * In hash mode, places the /link route after #. Outside production, passes site if given.
 */
export const linkUrl = (
  code: string,
  loc: { origin: string; pathname: string },
  hash: boolean,
  site?: string
): string => {
  const params = new URLSearchParams({ code, ...(site ? { site } : {}) });
  const route = `/link?${params.toString()}`;
  const path = loc.pathname.endsWith("/") ? loc.pathname : `${loc.pathname}/`;
  return hash ? `${loc.origin}${path}#${route}` : `${loc.origin}${route}`;
};

/**
 * Reads a link URL from QR or browser route.
 * Looks in both window search params and hash query params.
 * Drops site query parameter in production.
 */
export const readLink = (
  href: string,
  production: boolean
): { code: string; site?: string } | null => {
  try {
    const url = new URL(href, "http://localhost");
    const hashIndex = url.hash.indexOf("?");
    const hashParams = hashIndex >= 0 ? new URLSearchParams(url.hash.slice(hashIndex)) : null;
    const codeRaw = url.searchParams.get("code") ?? hashParams?.get("code");
    const code = codeRaw ? normalizeCode(codeRaw) : null;
    if (!code) return null;
    const siteRaw = url.searchParams.get("site") ?? hashParams?.get("site");
    const result: { code: string; site?: string } = { code };
    const keepSite = !production && typeof siteRaw === "string" && siteRaw.length > 0;
    if (keepSite) result.site = siteRaw;
    return result;
  } catch {
    return null;
  }
};

/** Friendly device name for the Game Master's phone list */
export const phoneLabel = (nickname: string, userAgent: string, platform: string): string => {
  const name = nickname.trim();
  const hasName = name.length > 0;
  const prefix = hasName ? `${name}'s ` : "";
  const isIos = platform === "ios";
  if (isIos) return `${prefix}iPhone`;
  const isAndroid = platform === "android";
  if (isAndroid) return `${prefix}Android`;
  const isIpadWeb = /iPad/.test(userAgent);
  if (isIpadWeb) return `${prefix}iPad`;
  const isIphoneWeb = /iPhone/.test(userAgent);
  if (isIphoneWeb) return `${prefix}iPhone`;
  const isAndroidWeb = /Android/.test(userAgent);
  if (isAndroidWeb) return `${prefix}Android`;
  const isWindowsWeb = /Windows/.test(userAgent);
  if (isWindowsWeb) return `${prefix}Windows PC`;
  const isMacWeb = /Macintosh|Mac OS X/.test(userAgent);
  if (isMacWeb) return `${prefix}Mac`;
  const isLinuxWeb = /Linux/.test(userAgent);
  if (isLinuxWeb) return `${prefix}Linux`;
  return hasName ? `${name}'s phone` : "phone";
};
