/**
 * The climb lock of a project tower (docs: Project Towers, section 5) as the temple screen wires it: the live room
 * context carries `floorCleared` for the floor the hero stands on, from the tower (useProjectTower), and the stairs up
 * climb only while it is true. A temple that is no tower answers undefined and its context carries no such field.
 */
import { defineComponent, ref } from "vue";
import type { Router } from "vue-router";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { roomActions, resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { useUserStore } from "@/lib/store/stores/user";
import { useRoomOutcomes, type RoomOutcomeDeps } from "@/app/Console/TempleGrounds/templeGrounds/useRoomOutcomes";
import { addHero, dungeons, enter, HERO, makeTemple, temples } from "./templeFixtures";

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
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
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

/** The entrance with the floor's stairs up beside it, and the floor above */
const stairsTemple = (): string => {
  const rooms: Record<string, Room> = {
    E: { type: "entrance" },
    U: { type: "stairs-up", content: { locked: "floorCleared", targetLevel: "2F", targetCoords: { x: 0, y: 0 } } },
    D: { type: "stairs-down", content: { targetLevel: "1F", targetCoords: { x: 1, y: 0 } } },
  };
  const id = makeTemple(rooms, { "1F": [["E", "U"]], "2F": [["D", "D"]] });
  enter(id, [0, 1], "1F");
  return id;
};

/** The live room context as the temple screen asks for it, with the tower's answer to "is this floor cleared?" */
const liveContextOf = (temple: string, isFloorCleared?: (level: string) => boolean | undefined) => {
  let outcomes!: ReturnType<typeof useRoomOutcomes>;
  const pass = () => undefined;
  mount(
    defineComponent({
      setup() {
        outcomes = useRoomOutcomes({
          props: { temple, userId: HERO },
          userStore: useUserStore(),
          router: { push: jest.fn(), replace: jest.fn() } as unknown as Router,
          progressHeroId: HERO,
          templeSystem: temples,
          currentPosition: ref<[number, number]>([0, 1]),
          currentLevel: ref("1F"),
          showTempleMessage: pass,
          handleTeleport: () => false,
          say: pass,
          fx: pass,
          showFanfare: pass,
          updateBg: pass,
          leaveTemple: pass,
          showTempleCleared: pass,
          showChestContentsDialog: pass,
          showEmptyChest: pass,
          showDropReveal: pass,
          openChoiceReveal: pass,
          beastCard: async () => null,
          activeMonster: ref(null),
          isFloorCleared,
        } as unknown as RoomOutcomeDeps);
        return {};
      },
      render: () => null,
    })
  );
  return outcomes.getLiveContext();
};

const labelsAt = (temple: string, live: NonNullable<ReturnType<typeof liveContextOf>>) =>
  roomActions(dungeons.getRoom(temple, [0, 1])!, live.ctx).actions.map((action) => action.label);

describe("the live context of a project tower", () => {
  it("carries floorCleared for the floor the hero stands on, asked by its key", () => {
    const asked = jest.fn(() => true);
    const live = liveContextOf(stairsTemple(), asked)!;

    expect(live.ctx.floorCleared).toBe(true);
    expect(asked).toHaveBeenCalledWith("1F");
  });

  it("lets the stairs climb from a cleared floor, and keeps them shut from one that is not", () => {
    const shutTemple = stairsTemple();
    const shut = liveContextOf(shutTemple, () => false)!;
    expect(shut.ctx.floorCleared).toBe(false);
    expect(labelsAt(shutTemple, shut)).toEqual([]);

    const openTemple = stairsTemple();
    const open = liveContextOf(openTemple, () => true)!;
    expect(labelsAt(openTemple, open)).toEqual(["Climb"]);
  });
});

describe("the live context of any other temple", () => {
  it("carries no floorCleared at all when the screen has no answer for it", () => {
    const live = liveContextOf(stairsTemple(), () => undefined)!;
    expect("floorCleared" in live.ctx).toBe(false);
  });

  it("carries none when the screen does not ask the tower", () => {
    const live = liveContextOf(stairsTemple())!;
    expect("floorCleared" in live.ctx).toBe(false);
  });
});
