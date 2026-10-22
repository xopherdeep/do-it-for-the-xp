import { CATALOG } from "@/lib/services/copy/catalog";
import { copyFor, hasCopy } from "@/lib/services/copy/copy";
import type { CopyCatalog } from "@/lib/services/copy/voices";

const SYNC_KEYS = [
  "sync.busy",
  "sync.tookOver",
  "sync.firstPull",
  "sync.firstPush",
  "sync.proRequired",
  "sync.offline",
  "sync.verdictSent",
  "sync.verdictRejectedSent",
  "sync.playHere",
  "sync.play",
  "sync.notNow",
  "sync.thisPhone",
];

describe("the clerk's sync lines", () => {
  it("every sync line exists in the adventure voice and has no em dash", () => {
    for (const key of SYNC_KEYS) {
      expect(hasCopy(key)).toBe(true);
      const line = (CATALOG as CopyCatalog)[key].adventure;
      expect(line.trim()).not.toBe("");
      expect(line).not.toContain("—");
    }
  });

  it("holds no sync line beyond the ones the spec names", () => {
    const written = Object.keys(CATALOG).filter((key) => key.startsWith("sync."));
    expect(written.sort()).toEqual([...SYNC_KEYS].sort());
  });

  it("speaks the busy, took-over and phone lines with their placeholders", () => {
    expect(copyFor("sync.busy", "adventure", { nick: "Mo", device: "the iPad", ago: "2 min ago" })).toBe(
      "Mo is still playing on the iPad (last seen 2 min ago). Play here anyway?",
    );
    expect(copyFor("sync.tookOver", "adventure", { nick: "Mo", device: "the iPad" })).toBe(
      "the iPad took over Mo's game while this one was away. This device has caught up.",
    );
    expect(copyFor("sync.thisPhone", "adventure", { nick: "Mo" })).toBe("This is Mo's phone");
    expect(copyFor("sync.verdictSent", "adventure", { nick: "Mo" })).toBe("Approved · paying on Mo's device");
  });

  it("keeps the fixed lines word for word", () => {
    expect(copyFor("sync.verdictRejectedSent", "adventure")).toBe("Not this time · sent");
    expect(copyFor("sync.playHere", "adventure")).toBe("Play here");
    expect(copyFor("sync.play", "adventure")).toBe("Play");
    expect(copyFor("sync.notNow", "adventure")).toBe("Not now");
  });
});
