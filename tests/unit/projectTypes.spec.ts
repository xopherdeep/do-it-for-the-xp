/**
 * The project types (Spring Cleaning, Moving Out) as data: phases with shares, suggested chores sized on the
 * Fibonacci slider, and the finale boss each tower ends on. Pure data, so the cases check its shape and the two
 * contents the owner named.
 */
import { MOVING_PHASES, MOVING_TEMPLATES } from "@/lib/services/core/packs/movingPack";
import { PROJECT_TYPES, projectTypeOf } from "@/lib/services/core/packs/projects";
import type { ProjectChoreSuggestion, ProjectType } from "@/lib/services/core/packs/projects";
import { nearestDifficulty } from "@/lib/services/core/packs/projects/movingOut";

jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, abilitiesStorage: { sentinel: "abilities" } }));
jest.mock("@/lib/databases/AccessoriesDb", () => ({
  __esModule: true,
  accessoriesStorage: { sentinel: "accessories" },
  AccessoryType: { RealLife: "real", Virtual: "virtual" },
  Rarity: { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 },
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: { sentinel: "achievements" },
  achievementCategoryStorage: { sentinel: "achievementCategories" },
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({ __esModule: true, beastStorage: { sentinel: "beasts" } }));
jest.mock("@/lib/databases/ChatDb", () => ({ __esModule: true, chatStorage: { sentinel: "chat" } }));
jest.mock("@/lib/databases/DosDontsDb", () => ({ __esModule: true, dosDontsStorage: { sentinel: "dosDonts" } }));
jest.mock("@/lib/databases/PackLibraryDb", () => ({ __esModule: true, packLibraryStorage: { sentinel: "packs" } }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: { sentinel: "profiles" } }));
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ __esModule: true, purchaseLogStorage: { sentinel: "purchaseLog" } }));
jest.mock("@/lib/databases/QuestLogDb", () => ({ __esModule: true, questLogStorage: { sentinel: "questLog" } }));
jest.mock("@/lib/databases/ShopsDb", () => ({
  __esModule: true,
  shopStorage: { sentinel: "shops" },
  ShopItemType: { Ability: 0, Accessory: 1 },
}));
jest.mock("@/lib/databases/TempleDb", () => ({ __esModule: true, templeStorage: { sentinel: "temples" } }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({ __esModule: true, templeProgressStorage: { sentinel: "templeProgress" } }));
jest.mock("@/lib/services/core/StorageService", () => ({ __esModule: true, default: { saveProfiles: jest.fn() } }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canManageFamily: () => true, RESTORE_GM_ONLY_MESSAGE: "GM only" }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ loadUsers: jest.fn() }) }));

const SLIDER = [1, 2, 3, 5, 8, 13];
const ROOM_KINDS = [
  "bedroom", "bathroom", "kitchen", "living", "dining", "laundry", "storage", "garage", "guest", "office", "yard", "pets",
];
const BAND_RANGE: Record<string, [number, number]> = { little: [1, 2], kid: [2, 5], grownup: [5, 13] };

const choresOf = (type: ProjectType): ProjectChoreSuggestion[] => type.phases.flatMap((phase) => [...phase.chores]);
const allOf = (type: ProjectType): ProjectChoreSuggestion[] => [...choresOf(type), type.finale];
const phaseIds = (type: ProjectType): string[] => type.phases.map((phase) => phase.id);
const choreIn = (type: ProjectType, slug: string): ProjectChoreSuggestion | undefined => choresOf(type).find((chore) => chore.slug === slug);

describe.each(Object.values(PROJECT_TYPES))("the $name project type", (type) => {
  it("has phases whose shares sum to 1", () => {
    const total = type.phases.reduce((sum, phase) => sum + phase.share, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-9);
  });

  it("gives every phase at least one chore and a name", () => {
    for (const phase of type.phases) {
      expect(phase.chores.length).toBeGreaterThanOrEqual(1);
      expect(phase.name.trim()).not.toBe("");
      expect(phase.name).not.toMatch(/^\d/);
    }
  });

  it("keeps slugs unique within the type, the finale included", () => {
    const slugs = allOf(type).map((chore) => chore.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(phaseIds(type)).size).toBe(type.phases.length);
  });

  it("sizes every chore on the Fibonacci slider", () => {
    for (const chore of allOf(type)) expect(SLIDER).toContain(chore.difficulty);
  });

  it("ends on a team finale of difficulty 8 or more", () => {
    expect(type.finale.difficulty).toBeGreaterThanOrEqual(8);
    expect(type.finale.who).toBe("team");
  });

  it("names rooms the house questions know, or the whole house", () => {
    for (const chore of allOf(type)) {
      if (chore.rooms === "house") continue;
      expect(chore.rooms.length).toBeGreaterThanOrEqual(1);
      for (const room of chore.rooms) expect(ROOM_KINDS).toContain(room);
    }
  });

  it("sizes each chore for its band: little 1-2, kid 2-5, grown-up 5-13", () => {
    for (const chore of allOf(type)) {
      const range = BAND_RANGE[chore.who];
      if (!range) continue;
      expect(chore.difficulty).toBeGreaterThanOrEqual(range[0]);
      expect(chore.difficulty).toBeLessThanOrEqual(range[1]);
    }
  });

  it("writes short chore names with no em dashes", () => {
    for (const chore of allOf(type)) {
      expect(chore.name.trim()).not.toBe("");
      expect(chore.name.length).toBeLessThanOrEqual(40);
      expect(chore.name).not.toMatch(/[–—]/);
    }
  });

  it("gives every chore a sane time when it names one", () => {
    for (const chore of allOf(type)) {
      if (chore.minutes === undefined) continue;
      expect(chore.minutes).toBeGreaterThanOrEqual(5);
      expect(chore.minutes).toBeLessThanOrEqual(180);
    }
  });
});

describe("PROJECT_TYPES and projectTypeOf", () => {
  it("keys each type by its own id", () => {
    for (const [id, type] of Object.entries(PROJECT_TYPES)) expect(type.id).toBe(id);
    expect(Object.keys(PROJECT_TYPES).sort()).toEqual(["moving-out", "spring-cleaning"]);
  });

  it("finds a type by id and answers undefined for anything else", () => {
    expect(projectTypeOf("spring-cleaning")).toBe(PROJECT_TYPES["spring-cleaning"]);
    expect(projectTypeOf("moving-out")).toBe(PROJECT_TYPES["moving-out"]);
    expect(projectTypeOf("holiday-prep")).toBeUndefined();
    expect(projectTypeOf("")).toBeUndefined();
    expect(projectTypeOf("toString")).toBeUndefined();
    expect(projectTypeOf("constructor")).toBeUndefined();
  });
});

describe("Spring Cleaning", () => {
  const spring = PROJECT_TYPES["spring-cleaning"];

  it("climbs Declutter, Deep Clean, Organize and Final Inspection on shares 0.3, 0.4, 0.2 and 0.1", () => {
    expect(phaseIds(spring)).toEqual(["declutter", "deep-clean", "organize", "final-inspection"]);
    expect(spring.phases.map((phase) => phase.name)).toEqual(["Declutter", "Deep Clean", "Organize", "Final Inspection"]);
    expect(spring.phases.map((phase) => phase.share)).toEqual([0.3, 0.4, 0.2, 0.1]);
  });

  it("is a two week wind tower called The Spring Spire", () => {
    expect(spring.name).toBe("Spring Cleaning");
    expect(spring.towerName).toBe("The Spring Spire");
    expect(spring.defaultDays).toBe(14);
    expect(spring.element).toBe("wind");
  });

  it("ends on The Final Inspection, a team boss of difficulty 8", () => {
    expect(spring.finale.name).toBe("The Final Inspection");
    expect(spring.finale.difficulty).toBe(8);
    expect(spring.finale.who).toBe("team");
    expect(spring.finale.rooms).toBe("house");
  });

  it("holds 4 to 8 chores in each phase", () => {
    for (const phase of spring.phases) {
      expect(phase.chores.length).toBeGreaterThanOrEqual(4);
      expect(phase.chores.length).toBeLessThanOrEqual(8);
    }
  });

  it("sizes chores by band, from Match the Socks to Deep Clean the Oven", () => {
    const socks = choresOf(spring).find((chore) => chore.name === "Match the Socks");
    const bed = choresOf(spring).find((chore) => chore.name === "Clear Under the Bed");
    const oven = choresOf(spring).find((chore) => chore.name === "Deep Clean the Oven");
    expect([socks?.who, socks?.difficulty]).toEqual(["little", 1]);
    expect([bed?.who, bed?.difficulty]).toEqual(["kid", 3]);
    expect([oven?.who, oven?.difficulty]).toEqual(["grownup", 8]);
  });

  it("keeps a little chore on the Final Inspection floor, and the window chore with a kid", () => {
    const final = spring.phases.find((phase) => phase.id === "final-inspection");
    expect(final?.chores.some((chore) => chore.who === "little")).toBe(true);
    const windows = choresOf(spring).find((chore) => chore.name === "Open the Windows for Fresh Air");
    expect([windows?.who, windows?.difficulty]).toEqual(["kid", 2]);
  });

  it("has chores for every band and for the kitchen, bathroom, bedroom, living room, garage, storage and house", () => {
    const chores = choresOf(spring);
    const bands = new Set(chores.map((chore) => chore.who));
    for (const band of ["little", "kid", "grownup"]) expect(bands).toContain(band);
    const kinds = new Set(chores.flatMap((chore) => (chore.rooms === "house" ? ["house"] : [...chore.rooms])));
    for (const kind of ["kitchen", "bathroom", "bedroom", "living", "garage", "storage", "house"]) expect(kinds).toContain(kind);
  });

  it("leaves the beasts to the library's suggestion", () => {
    for (const chore of allOf(spring)) expect(chore.beastId).toBeUndefined();
  });
});

describe("Moving Out", () => {
  const moving = PROJECT_TYPES["moving-out"];
  const keptPhases = ["declutter", "quiet", "living", "last"];
  const templatesIn = (phase: string) => MOVING_TEMPLATES.filter((template) => template.phase === phase);
  const phaseNamed = (id: string) => MOVING_PHASES.find((phase) => phase.id === id)?.name ?? "";

  it("takes the Moving House pack's four pre-move phases, leaving out Moving Day, Unpack and the camp", () => {
    expect(phaseIds(moving)).toEqual(keptPhases);
    expect(moving.phases.map((phase) => phase.share)).toEqual([0.3, 0.3, 0.3, 0.1]);
  });

  it("names the phases as the pack does, without their numbers", () => {
    expect(moving.phases.map((phase) => phase.name)).toEqual([
      "Declutter and Donate", "Pack the Quiet Rooms", "Bedrooms and Living Rooms", "Kitchen and Bathrooms Last",
    ]);
    for (const phase of moving.phases) expect(phaseNamed(phase.id)).toMatch(new RegExp(`^\\d+ ${phase.name}$`));
  });

  it("is a four week earth tower", () => {
    expect(moving.name).toBe("Moving Out");
    expect(moving.defaultDays).toBe(28);
    expect(moving.element).toBe("earth");
    expect(moving.towerName.trim()).not.toBe("");
  });

  it("turns every template of those phases into one suggestion, in order, and no others", () => {
    for (const phase of moving.phases) {
      expect(phase.chores.map((chore) => chore.slug)).toEqual(templatesIn(phase.id).map((template) => template.slug));
    }
    const slugs = new Set(choresOf(moving).map((chore) => chore.slug));
    for (const left of ["load-van", "walkthrough", "deep-clean", "first-night", "kitchen-first"]) expect(slugs.has(left)).toBe(false);
  });

  it("carries the template's name, time, band and the beast id the pack gives its quest", () => {
    for (const template of MOVING_TEMPLATES) {
      const chore = choreIn(moving, template.slug);
      if (!chore) continue;
      expect(chore.name).toBe(template.quest);
      expect(chore.minutes).toBe(template.minutes);
      expect(chore.who).toBe(template.who);
      expect(chore.beastId).toBe(`beast-move-${template.slug}`);
      expect(chore.difficulty).toBe(template.difficulty);
    }
  });

  it("maps a template's rooms to rooms, and a template with none to the whole house", () => {
    expect(choreIn(moving, "supplies")?.rooms).toBe("house");
    expect(choreIn(moving, "garage")?.rooms).toEqual(["garage"]);
    expect(choreIn(moving, "living-dining")?.rooms).toEqual(["living", "dining"]);
  });

  it("keeps the band of a chore that is one for each hero", () => {
    expect(choreIn(moving, "keep-donate-trash")?.who).toBe("kid");
    expect(choreIn(moving, "toy-triage")?.who).toBe("little");
    expect(choreIn(moving, "closet-grownup")?.who).toBe("grownup");
    expect(choreIn(moving, "open-first")?.who).toBe("team");
  });

  it("marks a chore that is one for each hero as perHero, and no other", () => {
    const heroTemplates = MOVING_TEMPLATES.filter((template) => template.hero && keptPhases.includes(template.phase));
    expect(heroTemplates.length).toBeGreaterThan(0);
    for (const template of MOVING_TEMPLATES) {
      const chore = choreIn(moving, template.slug);
      if (!chore) continue;
      expect(chore.perHero).toBe(template.hero ? true : undefined);
    }
    for (const template of heroTemplates) expect(choreIn(moving, template.slug)?.perHero).toBe(true);
  });

  it("ends on Hand Over the Keys with the van-loading boss's difficulty and beast", () => {
    const van = MOVING_TEMPLATES.find((template) => template.slug === "load-van");
    expect(van).toBeDefined();
    expect(moving.finale.name).toBe("Hand Over the Keys");
    expect(moving.finale.difficulty).toBe(Math.max(8, van?.difficulty ?? 0));
    expect(moving.finale.beastId).toBe("beast-move-load-van");
    expect(moving.finale.who).toBe("team");
    expect(moving.finale.rooms).toBe("house");
  });
});

describe("nearestDifficulty", () => {
  it("keeps a slider value as it is", () => {
    for (const step of SLIDER) expect(nearestDifficulty(step)).toBe(step);
  });

  it("rounds to the nearest slider value", () => {
    expect(nearestDifficulty(6)).toBe(5);
    expect(nearestDifficulty(7)).toBe(8);
    expect(nearestDifficulty(10)).toBe(8);
    expect(nearestDifficulty(12)).toBe(13);
  });

  it("rounds a tie up", () => {
    expect(nearestDifficulty(2.5)).toBe(3);
    expect(nearestDifficulty(4)).toBe(5);
    expect(nearestDifficulty(6.5)).toBe(8);
    expect(nearestDifficulty(10.5)).toBe(13);
  });

  it("holds a stray number to the ends of the slider", () => {
    expect(nearestDifficulty(0)).toBe(1);
    expect(nearestDifficulty(-4)).toBe(1);
    expect(nearestDifficulty(21)).toBe(13);
  });
});
