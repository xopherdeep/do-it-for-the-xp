import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkMarkup, findPlaceholders, renderMarkup } from "../../tools/site/markup";

const NAMES = ["hometown", "battle", "victory", "temple-map", "beast-log", "boss", "small-key", "my-home"];
const page = readFileSync(join(__dirname, "../../tools/site/doit-front-page.html"), "utf8");
const vars: Record<string, string> = { app: "https://app.doit.forthexp.com" };
for (const n of NAMES) { vars[`media:${n}`] = `https://site/${n}.jpg`; vars[`media-id:${n}`] = "1"; }

describe("doit-front-page.html", () => {
  it("uses only the agreed placeholders", () => {
    expect(findPlaceholders(page).every((k) => k in vars)).toBe(true);
  });
  it("renders clean markup", () => {
    expect(checkMarkup(renderMarkup(page, vars))).toEqual([]);
  });
  it("carries the spec's copy and links", () => {
    const html = renderMarkup(page, vars);
    expect(html).toContain("Do It For The XP");
    expect(html).toContain("Chores become quests. Kids become heroes. Parents are the Game Masters.");
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('href="https://app.doit.forthexp.com"');
    expect(html).toContain('href="https://www.forthexp.com"');
    expect(html).toContain('href="/cafeteria-board/feature-requests/"');
    expect(html).toContain('href="https://github.com/xopherdeep/do-it-for-the-xp"');
    expect(html).toContain('<iframe');
    const text = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/\$\d|per month|lifetime/i);
    expect(text).not.toContain("!");
  });
  it("ships the template override from the spec", () => {
    const tpl = readFileSync(join(__dirname, "../../tools/site/front-page-template.html"), "utf8");
    expect(tpl).toContain('wp:template-part {"slug":"header"');
    expect(tpl).toContain("wp:post-content");
    expect(tpl).not.toContain("wp:xophz-magic-hat/hero");
  });
});
