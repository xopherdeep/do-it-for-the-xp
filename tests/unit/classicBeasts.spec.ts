import { existsSync } from "fs";
import { join } from "path";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS, PEGASUS_AVATARS, isClassicBeastId } from "@/lib/services/core/classicBeasts";
import { MAX_BG_INDEX } from "@/lib/services/battle/BestiaryService";

const BEAST_ART = join(__dirname, "../../src/assets/images/beasts");
const pad = (n: number) => String(n).padStart(3, "0");

describe("the classic beasts", () => {
  const expectedAvatars = Array.from({ length: 93 }, (_, i) => i + 1).filter((n) => n < 41 || n > 46);

  it("hold one beast for every original monster picture, 1 to 93 without the six Pegasus sprites", () => {
    expect(CLASSIC_BEASTS).toHaveLength(87);
    expect(CLASSIC_BEASTS.map((b) => b.avatar)).toEqual(expectedAvatars);
    for (const avatar of PEGASUS_AVATARS) expect(CLASSIC_BEASTS.some((b) => b.avatar === avatar)).toBe(false);
  });

  it("number their ids after the picture and never repeat an id, a name or a picture", () => {
    expect(CLASSIC_BEASTS.map((b) => b.id)).toEqual(expectedAvatars.map((n) => `beast-classic-${pad(n)}`));
    expect(new Set(CLASSIC_BEASTS.map((b) => b.name)).size).toBe(87);
    expect(new Set(CLASSIC_BEASTS.map((b) => b.avatar)).size).toBe(87);
  });

  it("only point at pictures that exist as files", () => {
    for (const beast of CLASSIC_BEASTS) expect(existsSync(join(BEAST_ART, `${pad(beast.avatar!)}.webp`))).toBe(true);
  });

  it("call the kids' character by the name the family uses and wait for the others to be named", () => {
    expect(CLASSIC_BEASTS.find((b) => b.avatar === 50)?.name).toBe("Moanin Ronan");
    expect(CLASSIC_BEASTS.find((b) => b.avatar === 12)?.name).toBe("Classic Beast 012");
  });

  it("are ready to fight when chosen: battle backgrounds in range, a task list of at least three steps, and no element", () => {
    for (const beast of CLASSIC_BEASTS) {
      expect(beast).not.toHaveProperty("element");
      expect(beast.bg1).toBeGreaterThanOrEqual(0);
      expect(beast.bg1).toBeLessThanOrEqual(MAX_BG_INDEX);
      expect(beast.bg2).toBeGreaterThanOrEqual(0);
      expect(beast.bg2).toBeLessThanOrEqual(MAX_BG_INDEX);
      expect(beast.bg1).not.toBe(beast.bg2);
      expect(beast.checklist.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("do not touch the chore library: no shared id or picture, and no chore, room or age", () => {
    const libraryIds = new Set(BEAST_LIBRARY.map((b) => b.id));
    const libraryAvatars = new Set(BEAST_LIBRARY.flatMap((b) => [b.avatar, b.variantAvatar]));
    for (const beast of CLASSIC_BEASTS) {
      expect(libraryIds.has(beast.id)).toBe(false);
      expect(libraryAvatars.has(beast.avatar)).toBe(false);
      expect(beast.chore).toBeUndefined();
      expect(beast.room).toBeUndefined();
      expect(beast.age).toBeUndefined();
    }
    expect(BEAST_LIBRARY).toHaveLength(100);
  });

  it("are told apart from every other beast by their id alone, whatever they are renamed", () => {
    expect(CLASSIC_BEASTS.every((b) => isClassicBeastId(b.id))).toBe(true);
    expect(BEAST_LIBRARY.some((b) => isClassicBeastId(b.id))).toBe(false);
    expect(isClassicBeastId("beast-made-by-the-kids")).toBe(false);
    expect(isClassicBeastId(undefined)).toBe(false);
  });

  it("give every beast its own task list to edit, not one shared array", () => {
    expect(CLASSIC_BEASTS[0].checklist).not.toBe(CLASSIC_BEASTS[1].checklist);
  });
});
