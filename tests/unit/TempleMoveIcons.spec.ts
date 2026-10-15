/**
 * The four movement controls of the temple screen: useTemple's `moveIcons` says what each one wears. An arrow over an
 * open door, a lock over a locked one, and a bomb over a cracked wall (tapping that one asks about a Bomb). The bomb
 * goes back to the arrow the moment the wall is blown open.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { useTemple } from "@/hooks/temples/useTemple";
import { resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
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

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});

let counter = 0;

/** The hero in H with a room on every side; `extra` is what the Game Master drew on H (barriers, locks) */
const hallWith = (extra: object) => {
  const id = `move-icons-${++counter}`;
  makeTemple(
    {
      E: { type: "entrance" },
      H: { type: "empty", ...extra } as Room,
      F: { type: "empty" },
      U: { type: "empty" },
      D: { type: "empty" },
      W: { type: "wall" },
    },
    [
      ["W", "U", "W"],
      ["E", "H", "F"],
      ["W", "D", "W"],
    ],
    id
  );
  enter(id, [1, 1]);
  return id;
};

const screen = (id: string) => {
  const wrapper = mount(defineComponent({ setup: () => useTemple(id, [1, 1], undefined, HERO), render: () => null }));
  return { vm: wrapper.vm as any, unmount: () => wrapper.unmount() };
};

describe("the icon each movement control wears", () => {
  it("is an arrow over an open door", () => {
    const { vm, unmount } = screen(hallWith({}));

    expect(vm.moveIcons).toEqual({
      north: "fa-arrow-alt-up",
      south: "fa-arrow-alt-down",
      west: "fa-arrow-alt-left",
      east: "fa-arrow-alt-right",
    });
    unmount();
  });

  it("is a lock over a locked door", () => {
    const { vm, unmount } = screen(hallWith({ locked: { east: true } }));

    expect(vm.moveIcons.east).toBe("fa-lock");
    expect(vm.moveIcons.west).toBe("fa-arrow-alt-left");
    unmount();
  });

  it("is a bomb over a cracked wall, and only there", () => {
    const { vm, unmount } = screen(hallWith({ barriers: { north: "bombable" } }));

    expect(vm.moveIcons.north).toBe("fa-bomb");
    expect(vm.canMoveUp).toBe(true);
    expect(vm.moveIcons.south).toBe("fa-arrow-alt-down");
    unmount();
  });

  it("puts the bomb before the lock when a cracked side is locked too", () => {
    const { vm, unmount } = screen(hallWith({ barriers: { south: "bombable" }, locked: { south: true } }));

    expect(vm.moveIcons.south).toBe("fa-bomb");
    unmount();
  });

  it("turns back into an arrow once the wall is blown open", () => {
    const id = hallWith({ barriers: { east: "bombable" } });
    const { vm, unmount } = screen(id);
    expect(vm.moveIcons.east).toBe("fa-bomb");

    temples.blowBombableSide(id, [1, 1], "east");

    expect(vm.moveIcons.east).toBe("fa-arrow-alt-right");
    unmount();
  });

  it("shows no control over a plain wall", () => {
    const { vm, unmount } = screen(hallWith({ barriers: { north: "wall" } }));

    expect(vm.canMoveUp).toBe(false);
    unmount();
  });
});
