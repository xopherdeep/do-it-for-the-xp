import fs from "fs";
import path from "path";

/** Every dropdown in the app opens as a bottom sheet (big rows, easy to tap), not a small popover or alert. */
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "Dev" ? [] : walk(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });

describe("dropdowns", () => {
  it("open as action sheets (a multiple pick has to stay an alert)", () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(__dirname, "../../src"))) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/<ion-select\b(?!-)[^>]*>/gs)) {
        const tag = match[0];
        const isMultiple = /\bmultiple\b/.test(tag);
        const isSheet = tag.includes('interface="action-sheet"');
        if (!isMultiple && !isSheet) offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
