/**
 * The cracked wall's sheet (useWallReveal): the control over a cracked side opens it; it offers "Bomb it" only to a hero
 * holding the Bombs with a Bomb in the pack; "Bomb it" lights the Bomb in the temple on the tapped side, and the sheet
 * keeps the room's shake and the words until it has played the crumble.
 */
import { createPinia, setActivePinia } from "pinia";
import type { EquipmentItem } from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { bombInPack } from "@/lib/services/temples/ItemUse";
import { useUserStore } from "@/lib/store/stores/user";
import { useWallReveal } from "@/app/Console/TempleGrounds/templeGrounds/templeReveals";
import { HERO, addHero, enter, makeTemple, temples } from "./templeFixtures";

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

const BOMBS: EquipmentItem = { name: "Bombs", faIcon: "bomb", desc: "" };
const LANTERN: EquipmentItem = { name: "Lantern", faIcon: "flashlight", desc: "" };

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});

const packBombs = (qty: number) => useUserStore().addInventoryItem(HERO, { name: "Bomb", kind: "consumable", qty });

/** The hero in H, cracked walls where `barriers` say, a room on every side */
const crackedHall = (barriers: object, extra: object = {}) => {
  const id = makeTemple(
    {
      E: { type: "entrance" },
      H: { type: "empty", barriers, ...extra } as Room,
      F: { type: "empty" },
      U: { type: "empty" },
      D: { type: "empty" },
      W: { type: "wall" },
    },
    [
      ["W", "U", "W"],
      ["E", "H", "F"],
      ["W", "D", "W"],
    ]
  );
  enter(id, [1, 1]);
  return id;
};

/** The sheet's composable, wired to the live temple the way TempleGrounds wires it */
const sheet = (templeId: string, hands: Array<EquipmentItem | null>) => {
  const applyOutcome = jest.fn().mockResolvedValue(undefined);
  const liveContext = () => {
    const state = temples.getTempleState(templeId)!;
    return {
      room: temples.getCurrentRoom(templeId),
      ctx: { userId: HERO, templeId, level: state.currentLevel, position: [state.currentPosition[0], state.currentPosition[1]] as [number, number] },
    };
  };
  const reveal = useWallReveal({ liveContext, applyOutcome, heldItems: () => hands, catalog: () => [BOMBS, LANTERN] } as never);
  return { reveal, applyOutcome };
};

describe("opening the sheet over a cracked wall", () => {
  it("offers Bomb it to a hero with the Bombs in a hand and a Bomb in the pack", () => {
    packBombs(2);
    const { reveal } = sheet(crackedHall({ north: "bombable" }), [LANTERN, BOMBS]);

    reveal.showCrackedWall("north");

    expect(reveal.wall.isWallOpen.value).toBe(true);
    expect(reveal.wall.wallShown.value).toMatchObject({ side: "north", canBomb: true, bombs: 2, line: "The wall is cracked." });
    expect(reveal.wall.wallResult.value).toBeNull();
  });

  it("only says a Bomb would do it to a hero with no Bombs in a hand", () => {
    packBombs(2);
    const { reveal } = sheet(crackedHall({ north: "bombable" }), [LANTERN, null]);

    reveal.showCrackedWall("north");

    expect(reveal.wall.wallShown.value?.canBomb).toBe(false);
    expect(reveal.wall.wallShown.value?.line).toContain("Hold the Bombs in a hand");
  });

  it("says the hero is out of Bombs when the pack holds none", () => {
    const { reveal } = sheet(crackedHall({ north: "bombable" }), [BOMBS, null]);

    reveal.showCrackedWall("north");

    expect(reveal.wall.wallShown.value).toMatchObject({ canBomb: false, bombs: 0, line: "The wall is cracked. You are out of Bombs." });
  });

  it("closes on leave and spends nothing", () => {
    packBombs(1);
    const id = crackedHall({ north: "bombable" });
    const { reveal } = sheet(id, [BOMBS, null]);
    reveal.showCrackedWall("north");

    reveal.leaveShownWall();

    expect(reveal.wall.isWallOpen.value).toBe(false);
    expect(temples.doorKind(id, [1, 1], "north")).toBe("bombable");
    expect(bombInPack(HERO)?.qty).toBe(1);
  });
});

describe("Bomb it", () => {
  it("blows the tapped wall, not the first one clockwise, and answers 'blown' with the Bomb spent", async () => {
    packBombs(2);
    const id = crackedHall({ north: "bombable", west: "bombable" });
    const { reveal, applyOutcome } = sheet(id, [BOMBS, null]);
    reveal.showCrackedWall("west");

    await reveal.blowShownWall();

    expect(temples.doorKind(id, [1, 1], "west")).toBe("open");
    expect(temples.doorKind(id, [1, 1], "north")).toBe("bombable");
    expect(reveal.wall.wallResult.value).toBe("blown");
    expect(reveal.wall.wallShown.value?.bombs).toBe(1);
    expect(reveal.wall.isWallOpen.value).toBe(true); // the sheet plays the crumble before it hands back
    expect(applyOutcome).not.toHaveBeenCalled(); // and the room's shake and the words wait for it
  });

  it("gives the room its shake and the words once the sheet is done, without a second blast sound", async () => {
    packBombs(1);
    const { reveal, applyOutcome } = sheet(crackedHall({ east: "bombable" }), [BOMBS, null]);
    reveal.showCrackedWall("east");
    await reveal.blowShownWall();

    await reveal.completeShownWall();

    expect(reveal.wall.isWallOpen.value).toBe(false);
    expect(applyOutcome).toHaveBeenCalledTimes(1);
    expect(applyOutcome).toHaveBeenCalledWith(expect.objectContaining({ message: "Boom! The east wall blows open.", shake: true, sound: undefined }));
  });

  it("closes the sheet and lets the refusal speak when the temple will not blow the wall (a fight still on)", async () => {
    packBombs(1);
    const id = makeTemple(
      { E: { type: "entrance" }, M: { type: "monster", content: { lockOnEnter: true }, barriers: { east: "bombable" } } as Room, F: { type: "empty" } },
      [["E", "M", "F"]]
    );
    enter(id, [0, 0]);
    temples.moveToPosition(id, [0, 1], "east"); // the doors seal behind the hero
    const { reveal, applyOutcome } = sheet(id, [BOMBS, null]);
    reveal.showCrackedWall("east");

    await reveal.blowShownWall();

    expect(reveal.wall.isWallOpen.value).toBe(false);
    expect(reveal.wall.wallResult.value).toBe("refused");
    expect(applyOutcome).toHaveBeenCalledWith(expect.objectContaining({ sound: "error" }));
    expect(temples.doorKind(id, [0, 1], "east")).toBe("bombable");
    expect(bombInPack(HERO)?.qty).toBe(1);
  });

  it("does nothing for a hero who cannot bomb it", async () => {
    packBombs(1);
    const id = crackedHall({ east: "bombable" });
    const { reveal, applyOutcome } = sheet(id, [LANTERN, null]);
    reveal.showCrackedWall("east");

    await reveal.blowShownWall();

    expect(reveal.wall.wallResult.value).toBeNull();
    expect(applyOutcome).not.toHaveBeenCalled();
    expect(temples.doorKind(id, [1, 1], "east")).toBe("bombable");
    expect(bombInPack(HERO)?.qty).toBe(1);
  });

  it("starts a new sheet clean after a blown one", async () => {
    packBombs(2);
    const { reveal } = sheet(crackedHall({ east: "bombable", west: "bombable" }), [BOMBS, null]);
    reveal.showCrackedWall("east");
    await reveal.blowShownWall();
    await reveal.completeShownWall();

    reveal.showCrackedWall("west");

    expect(reveal.wall.wallResult.value).toBeNull();
    expect(reveal.wall.wallShown.value).toMatchObject({ side: "west", canBomb: true, bombs: 1 });
  });
});
