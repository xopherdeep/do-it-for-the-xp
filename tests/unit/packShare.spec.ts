import { FAMILY_PACK } from "@/lib/services/core/packs/catalog";
import { PackFormatError } from "@/lib/services/core/packs/packFormat";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { packBlock, packShareText, readPackBlock, withoutPackBlock } from "@/lib/services/core/packs/packShare";

const unicodePack: XpPack = { ...FAMILY_PACK, id: "cafe", name: "Café 🧹 \"quoted\" <b>", content: {} };

describe("the pack block", () => {
  it("reads back the pack it carries, whatever its characters", () => {
    expect(readPackBlock(packBlock(packShareText(unicodePack)))).toEqual(unicodePack);
    expect(readPackBlock(packBlock(packShareText(FAMILY_PACK)))).toEqual(FAMILY_PACK);
  });

  it("holds only characters WordPress leaves alone, in short lines", () => {
    const block = packBlock(packShareText(unicodePack));
    const inner = block.replace(/^[\s\S]*?xp-pack:1:\n/, "").replace(/<\/pre>$/, "");
    expect(inner).toMatch(/^[A-Za-z0-9+/=\n]+$/);
    inner.split("\n").forEach((line) => expect(line.length).toBeLessThanOrEqual(76));
  });

  it("is found in the content as the site renders it, after the note", () => {
    const rendered = `<p>Our chores. <strong>Enjoy</strong></p>\n<p>— Max, from Do It For The XP</p>\n${packBlock(packShareText(unicodePack)).trim()}\n`;
    expect(readPackBlock(rendered)).toEqual(unicodePack);
    expect(withoutPackBlock(rendered)).toBe("<p>Our chores. <strong>Enjoy</strong></p>\n<p>— Max, from Do It For The XP</p>");
  });

  it("turns away a post with no pack or a damaged one", () => {
    expect(() => readPackBlock("<p>Just words</p>")).toThrow(PackFormatError);
    expect(() => readPackBlock('<pre class="xp-pack">xp-pack:1:\nbm90IGpzb24=</pre>')).toThrow(PackFormatError);
  });
});
