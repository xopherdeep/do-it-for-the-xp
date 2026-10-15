import { computed, nextTick, ref } from "vue";
import type { Room } from "@/lib/engine/core/dungeons/types";

jest.mock("@/assets/fx", () => ({ play$fx: jest.fn() }));
jest.mock("@/lib/services/feedback/haptics", () => ({ rumble: jest.fn() }));

import { play$fx } from "@/assets/fx";
import { BOSS_BANNER_MS, FIRST_ARRIVAL_DELAY_MS, useBossEntrance } from "@/app/Console/TempleGrounds/templeGrounds/useBossEntrance";

const roomOf = (type: string) => ({ type, content: { beasts: [] } }) as unknown as Room;

const setup = (type: string, cleared = false) => {
  const currentRoom = ref<Room | undefined>(roomOf(type));
  const currentPosition = ref<[number, number]>([1, 1]);
  const currentLevel = ref("1F");
  const isCleared = ref(cleared);
  const name = ref("Socktopus");
  const entrance = useBossEntrance({
    currentRoom,
    currentPosition,
    currentLevel,
    isCombatRoomCleared: computed(() => isCleared.value),
    activeMonster: computed(() => ({ name: name.value })),
  });
  jest.advanceTimersByTime(FIRST_ARRIVAL_DELAY_MS);
  return { ...entrance, currentRoom, currentPosition, name };
};

describe("walking into a boss room", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (play$fx as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("names the boss on a banner with the encounter sting, then lifts it", () => {
    const { bossBanner } = setup("boss");
    expect(bossBanner.value).toEqual({ name: "Socktopus", tier: "boss" });
    expect(play$fx).toHaveBeenCalledWith("enterBattle");
    jest.advanceTimersByTime(BOSS_BANNER_MS);
    expect(bossBanner.value).toBeNull();
  });

  it("waits for the gate to open when the temple opens straight into the boss room", () => {
    const currentRoom = ref<Room | undefined>(roomOf("boss"));
    const { bossBanner } = useBossEntrance({
      currentRoom,
      currentPosition: ref<[number, number]>([0, 0]),
      currentLevel: ref("1F"),
      isCombatRoomCleared: computed(() => false),
      activeMonster: computed(() => ({ name: "Socktopus" })),
    });
    expect(bossBanner.value).toBeNull();
    jest.advanceTimersByTime(FIRST_ARRIVAL_DELAY_MS);
    expect(bossBanner.value?.name).toBe("Socktopus");
  });

  it("calls a miniboss a guardian tier", () => {
    expect(setup("miniboss").bossBanner.value?.tier).toBe("miniboss");
  });

  it("stays quiet in an ordinary room and in a beaten boss room", () => {
    expect(setup("monster").bossBanner.value).toBeNull();
    expect(setup("boss", true).bossBanner.value).toBeNull();
    expect(play$fx).not.toHaveBeenCalled();
  });

  it("follows the beast's name when it lands a beat later", async () => {
    const { bossBanner, name } = setup("boss");
    name.value = "Laundry King";
    await nextTick();
    expect(bossBanner.value?.name).toBe("Laundry King");
  });

  it("announces again on the next arrival in a boss room", async () => {
    const walk = setup("monster");
    walk.currentRoom.value = roomOf("boss");
    walk.currentPosition.value = [1, 2];
    await nextTick();
    expect(walk.bossBanner.value?.tier).toBe("boss");
  });

  it("drops the banner when the hero walks on, and a tap lifts it sooner", async () => {
    const walk = setup("boss");
    walk.currentRoom.value = roomOf("empty");
    walk.currentPosition.value = [1, 2];
    await nextTick();
    expect(walk.bossBanner.value).toBeNull();

    const tap = setup("boss");
    tap.dismissBossBanner();
    expect(tap.bossBanner.value).toBeNull();
  });
});
