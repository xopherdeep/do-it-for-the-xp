/**
 * Builds the HTML body of an `rpg-alert`: one short lead line, then a few scannable
 * groups of short lines instead of a paragraph. Ionic alerts render this HTML
 * (`innerHTMLTemplatesEnabled`), so every piece of text is escaped here.
 */

export type DialogTone = "add" | "keep" | "warn" | "info";

export interface DialogGroup {
  /** A small heading over the lines, like "Adds" or "Kept" */
  title?: string;
  /** Sets the bullet: + adds, ✓ keeps, ! warns, • otherwise */
  tone?: DialogTone;
  lines: string[];
}

export interface DialogMessage {
  lead: string;
  groups?: DialogGroup[];
  /** One line under the groups, for the thing that must not be missed */
  note?: string;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function dialogMessage({ lead, groups = [], note }: DialogMessage): string {
  const parts = [`<p class="rpg-alert__lead">${escapeHtml(lead)}</p>`];
  for (const group of groups) {
    const hasNoLines = !group.lines.length;
    if (hasNoLines) continue;
    const tone = group.tone ?? "info";
    const title = group.title;
    if (title) {
      parts.push(`<p class="rpg-alert__title">${escapeHtml(title)}</p>`);
    }
    const items = group.lines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
    parts.push(`<ul class="rpg-alert__list rpg-alert__list--${tone}">${items}</ul>`);
  }
  if (note) parts.push(`<p class="rpg-alert__note">${escapeHtml(note)}</p>`);
  return parts.join("");
}
