/**
 * A pack on the Town Hall's Pack Exchange board: a topic whose text is the Game Master's note, followed by the pack
 * itself. The site has no place for files, so the pack rides in the topic's content as one block:
 *
 *   <pre class="xp-pack">xp-pack:1:<the pack's JSON in base64, in lines of 76></pre>
 *
 * Base64 is letters, digits, + / and =, which WordPress leaves alone: kses has nothing to strip, and wptexturize and
 * wpautop never touch the inside of a <pre>, so the curly quotes and <p>s it adds elsewhere cannot break the JSON. The
 * reader looks for the marker anywhere in the rendered content and parses the pack with parsePack, like any pack file.
 * All pure.
 */
import { PackFormatError, parsePack } from "./packFormat";
import type { XpPack } from "./packFormat";

export const PACK_BLOCK_MARKER = "xp-pack:1:";

/** The largest pack the Town Hall takes, as JSON text: bigger ones are shared as a file */
export const PACK_SHARE_MAX_CHARS = 400_000;

const LINE = 76;

/** UTF-8 bytes as base64, since btoa alone throws on anything past Latin-1 (a quest called "Café 🧹") */
const toBase64 = (text: string): string =>
  btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));

/** Throws (URIError) on bytes that are not UTF-8, as well as on text that is not base64 */
const fromBase64 = (base64: string): string =>
  decodeURIComponent(
    Array.from(atob(base64), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
  );

/** The pack as compact JSON, the way it is kept in the outbox and sent */
export const packShareText = (pack: XpPack): string => JSON.stringify(pack);

/** Whether a pack is small enough for the Town Hall */
export const fitsTownHall = (packText: string): boolean => packText.length <= PACK_SHARE_MAX_CHARS;

/** The block that carries the pack in a topic's content */
export const packBlock = (packText: string): string => {
  const encoded = toBase64(packText);
  const lines = encoded.match(new RegExp(`.{1,${LINE}}`, "g")) ?? [];
  return `\n\n<pre class="xp-pack">${PACK_BLOCK_MARKER}\n${lines.join("\n")}</pre>`;
};

const BLOCK = /<pre\b[^>]*>\s*xp-pack:1:([A-Za-z0-9+/=\s]*?)\s*<\/pre>/i;

/**
 * The pack in a topic's rendered content. Throws PackFormatError when the topic has no pack or a damaged one, so the
 * Packs tab can show it as a pack that can't be read.
 */
export const readPackBlock = (html: string): XpPack => {
  const match = BLOCK.exec(html ?? "");
  if (!match) throw new PackFormatError("This post has no pack in it.");
  let text: string;
  try {
    text = fromBase64(match[1].replace(/\s+/g, ""));
  } catch {
    throw new PackFormatError("The pack in this post is damaged.");
  }
  return parsePack(text);
};

/** The topic's content without the pack block: the note the Game Master wrote */
export const withoutPackBlock = (html: string): string => (html ?? "").replace(new RegExp(BLOCK.source, "gi"), "").trim();
