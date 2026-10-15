/**
 * The small-key counter in the temple's header: useTemple's `playerKeys` is read straight from the temple's state, so
 * it goes up the moment a key is picked up, goes down the moment one is spent on a locked door, and never falls behind
 * (or overwrites) what the temple holds. `keyChange` says which way it moved and `keyPulse` ticks on every change, which
 * is what the header's number rolls on.
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

/** Entrance, a key chest, a hall whose east side is locked, a last room; the hero stands in `at` */
const keyTemple = (at: [number, number]) => {
  const id = `key-count-${++counter}`;
  makeTemple(
    {
      E: { type: "entrance" },
      C: { type: "loot", content: { chest: "dungeon", dungeon: "key" } } as Room,
      D: { type: "empty", locked: { east: true } },
      X: { type: "empty" },
    },
    [["E", "C", "D", "X"]],
    id
  );
  enter(id, at);
  return id;
};

/** The temple screen's hook, mounted for the hero */
const screen = (id: string, at: [number, number]) => {
  const wrapper = mount(
    defineComponent({
      setup: () => useTemple(id, at, undefined, HERO),
      render: () => null,
    })
  );
  return { vm: wrapper.vm as any, unmount: () => wrapper.unmount() };
};

describe("the small-key counter of the temple screen", () => {
  it("shows the keys the hero already holds", () => {
    const id = keyTemple([0, 2]);
    temples.addKey(id);
    temples.addKey(id);

    const { vm, unmount } = screen(id, [0, 2]);

    expect(vm.playerKeys).toBe(2);
    unmount();
  });

  it("goes up the moment a key is taken from a chest, and the temple holds the same count", () => {
    const id = keyTemple([0, 1]);
    const { vm, unmount } = screen(id, [0, 1]);
    const before = vm.keyPulse;

    vm.claimChestItems(["key"]);

    expect(vm.playerKeys).toBe(1);
    expect(temples.getTempleState(id)?.playerKeys).toBe(1);
    expect(vm.keyChange).toBe("up");
    expect(vm.keyPulse).toBe(before + 1);
    unmount();
  });

  it("goes down the moment a key is spent on a locked door", () => {
    const id = keyTemple([0, 2]);
    temples.addKey(id);
    temples.addKey(id);
    const { vm, unmount } = screen(id, [0, 2]);
    const before = vm.keyPulse;
    expect(vm.playerKeys).toBe(2);

    expect(temples.unlockDoor(id, [0, 2], "east")).toBe(true);

    expect(vm.playerKeys).toBe(1);
    expect(vm.keyChange).toBe("down");
    expect(vm.keyPulse).toBe(before + 1);
    unmount();
  });

  it("goes down through the hook's own unlock too", () => {
    const id = keyTemple([0, 2]);
    temples.addKey(id);
    const { vm, unmount } = screen(id, [0, 2]);

    vm.unlockDoor("east");

    expect(vm.playerKeys).toBe(0);
    unmount();
  });

  it("does not move when a key is refused", () => {
    const id = keyTemple([0, 2]);
    const { vm, unmount } = screen(id, [0, 2]);
    const before = vm.keyPulse;

    expect(temples.unlockDoor(id, [0, 2], "east")).toBe(false); // no key in hand

    expect(vm.playerKeys).toBe(0);
    expect(vm.keyPulse).toBe(before);
    unmount();
  });

  it("follows the temple's count, and a pickup adds to the temple's count, not to a copy", () => {
    const id = keyTemple([0, 1]);
    const { vm, unmount } = screen(id, [0, 1]);

    temples.getTempleState(id)!.playerKeys = 3; // saved progress arriving, a bomb, anything that changes the state
    expect(vm.playerKeys).toBe(3);

    vm.claimChestItems(["key"]);
    expect(temples.getTempleState(id)?.playerKeys).toBe(4);
    expect(vm.playerKeys).toBe(4);
    unmount();
  });

  it("can roll the number again without a change, for the reveal that covered it", () => {
    const id = keyTemple([0, 2]);
    const { vm, unmount } = screen(id, [0, 2]);
    const before = vm.keyPulse;

    vm.playKeyPulse();

    expect(vm.keyPulse).toBe(before + 1);
    expect(vm.playerKeys).toBe(0);
    unmount();
  });
});
