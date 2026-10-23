/**
 * What the temple screen does with an outcome (useRoomOutcomes.applyOutcome): the sound, the shake and the toast first,
 * then the hospital carry-off, then whatever the outcome's intent opens, then the room the hero was moved into.
 * The composable runs over the real temple engine and user store; the screen's reveals, toasts and sounds are spies in
 * a shared log, so the order of the side effects is pinned as well as the effects.
 */
import { defineComponent, ref } from "vue";
import type { Router } from "vue-router";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { templeBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { CIRCLE_FIZZLES } from "@/lib/engine/core/dungeons/teleportPairing";
import { hospitalRoute } from "@/lib/services/hometown/hospitalAdmission";
import { CARRIED_TO_HOSPITAL_LINE } from "@/lib/services/hometown/hospitalBill";
import { resetVisitMemory, type RoomOutcome } from "@/lib/services/temples/RoomInteractions";
import { pegasusOfTemple, pegasusView, WIND_TEMPLE_ID } from "@/lib/services/temples/TemplePegasus";
import { useUserStore } from "@/lib/store/stores/user";
import { useRoomOutcomes, type RoomOutcomeDeps } from "@/app/Console/TempleGrounds/templeGrounds/useRoomOutcomes";
import { addHero, enter, HERO, hp, makeTemple, temples } from "./templeFixtures";

// Waking a floor reads the family's quest board: nothing wakes here
jest.mock("@/lib/services/temples/wakeOnEntry", () => ({ __esModule: true, wakeTempleOnEntry: jest.fn(async () => null) }));
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

let pinia = createPinia();
beforeEach(() => {
  jest.useFakeTimers();
  pinia = createPinia();
  setActivePinia(pinia);
  resetVisitMemory();
  addHero();
});
afterEach(() => jest.useRealTimers());

const TRAP_ROOM: [number, number] = [0, 1];
const SMALL_KEY = { kind: "key", title: "Small Key" } as const;
const REWARD = { xp: 150, gp: 50, ap: 3, levelUp: false };

/** The entrance, then a trap the hero can dodge: walking into it opens its sheet (a way to see that the hero arrived) */
const trapTemple = (): string => {
  const id = makeTemple({ E: { type: "entrance" }, T: { type: "trap", content: { avoidable: true } } }, [["E", "T"]]);
  enter(id, TRAP_ROOM);
  return id;
};

/** The entrance, then a plain room: arriving there sets nothing off */
const quietTemple = (room: Room = { type: "empty" }, standingAt: [number, number] = TRAP_ROOM): string => {
  const id = makeTemple({ E: { type: "entrance" }, X: room }, [["E", "X"]]);
  enter(id, standingAt);
  return id;
};

/**
 * The temple screen's composable with every outward-facing dep a spy. `log` keeps the order of what the screen was
 * asked to do ("fx:ding", "say:hi", "chest", "reveal:sheet"); the spies keep the arguments.
 */
const screen = (id: string, over: Record<string, unknown> = {}, standingAt: [number, number] = TRAP_ROOM) => {
  const log: string[] = [];
  const mark = (name: string) =>
    jest.fn((arg?: unknown) => {
      log.push(typeof arg === "string" ? `${name}:${arg}` : name);
    });
  const spies = {
    say: mark("say"),
    fx: mark("fx"),
    showTempleMessage: mark("message"),
    showFanfare: jest.fn(() => {
      log.push("fanfare");
    }),
    leaveTemple: mark("leave"),
    showTempleCleared: mark("cleared"),
    showChestContentsDialog: mark("chest"),
    showEmptyChest: mark("emptyChest"),
    showDropReveal: mark("drop"),
    openChoiceReveal: jest.fn((reveal: { kind: string }) => {
      log.push(`reveal:${reveal.kind}`);
    }),
    updateBg: jest.fn(),
    handleTeleport: jest.fn(() => true),
  };
  const router = { push: jest.fn(), replace: jest.fn() };
  const currentPosition = ref<[number, number]>(standingAt);
  let outcomes!: ReturnType<typeof useRoomOutcomes>;
  mount(
    defineComponent({
      setup() {
        outcomes = useRoomOutcomes({
          props: { temple: id, userId: HERO },
          userStore: useUserStore(),
          router: router as unknown as Router,
          progressHeroId: HERO,
          templeSystem: temples,
          currentPosition,
          currentLevel: ref("1F"),
          ...spies,
          beastCard: async () => null,
          activeMonster: ref(null),
          ...over,
        } as unknown as RoomOutcomeDeps);
        return {};
      },
      render: () => null,
    }),
    { global: { plugins: [pinia] } }
  );
  const apply = (outcome: RoomOutcome) => outcomes.applyOutcome(outcome);
  return { ...spies, router, log, outcomes, apply, currentPosition };
};

const lastReveal = (reveal: jest.Mock) => reveal.mock.calls[reveal.mock.calls.length - 1][0];
const tick = async () => {
  for (let step = 0; step < 6; step++) await Promise.resolve();
};

describe("the sound, the shake and the toast", () => {
  it("plays the sound, shakes the game area for 400 ms and says the message, in that order", async () => {
    const s = screen(quietTemple());

    await s.apply({ sound: "ding", shake: true, message: "Ouch" });

    expect(s.log).toEqual(["fx:ding", "say:Ouch"]);
    expect(s.outcomes.isShaking.value).toBe(true);
    jest.advanceTimersByTime(399);
    expect(s.outcomes.isShaking.value).toBe(true);
    jest.advanceTimersByTime(1);
    expect(s.outcomes.isShaking.value).toBe(false);
  });

  it("does nothing for an outcome that has nothing to say", async () => {
    const s = screen(quietTemple());

    await s.apply({});

    expect(s.log).toEqual([]);
    expect(s.outcomes.isShaking.value).toBe(false);
  });

  it("says a message with no sound, and plays a sound with no message", async () => {
    const s = screen(quietTemple());

    await s.apply({ message: "Just words" });
    await s.apply({ sound: "chime" });

    expect(s.log).toEqual(["say:Just words", "fx:chime"]);
  });

  it("holds a found item overhead with the message under it, and says no toast", async () => {
    const s = screen(quietTemple());

    await s.apply({ sound: "key", message: "You find a small key", found: SMALL_KEY });

    expect(s.showFanfare).toHaveBeenCalledWith(SMALL_KEY, "You find a small key");
    expect(s.log).toEqual(["fx:key", "fanfare"]);
    expect(s.say).not.toHaveBeenCalled();
  });

  it("holds a found item overhead even with no message", async () => {
    const s = screen(quietTemple());

    await s.apply({ found: SMALL_KEY });

    expect(s.showFanfare).toHaveBeenCalledWith(SMALL_KEY, undefined);
  });

  it("keeps the sting and the toast back from a cleared temple (its reveal has its own), and still shakes", async () => {
    const s = screen(quietTemple());

    await s.apply({ sound: "ding", message: "Cleared!", shake: true, cleared: REWARD });

    expect(s.log).toEqual([]);
    expect(s.outcomes.isShaking.value).toBe(true);
  });

  it("clears an earlier shake's timer when it shakes again", async () => {
    const s = screen(quietTemple());

    await s.apply({ shake: true });
    jest.advanceTimersByTime(300);
    await s.apply({ shake: true });
    jest.advanceTimersByTime(300);
    expect(s.outcomes.isShaking.value).toBe(true);
    jest.advanceTimersByTime(100);
    expect(s.outcomes.isShaking.value).toBe(false);
  });
});

describe("a hero who was knocked out", () => {
  it("says the outcome's line, then that the hero was carried off, then goes to the Hospital after the line has been held", async () => {
    const s = screen(quietTemple());

    await s.apply({ sound: "ouch", message: "You black out.", defeated: true });

    expect(s.log).toEqual(["fx:ouch", "say:You black out.", "fx:die", `say:${CARRIED_TO_HOSPITAL_LINE}`]);
    expect(s.say).toHaveBeenLastCalledWith(CARRIED_TO_HOSPITAL_LINE, 1800);
    jest.advanceTimersByTime(1799);
    expect(s.router.replace).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(s.router.replace).toHaveBeenCalledWith(hospitalRoute(HERO));
  });

  it("stops there: no intent opens and the hero is not met in another room", async () => {
    const s = screen(trapTemple());

    await s.apply({ defeated: true, intent: "openChest", moved: true });

    expect(s.showChestContentsDialog).not.toHaveBeenCalled();
    expect(s.openChoiceReveal).not.toHaveBeenCalled();
  });

  it("is carried to the Hospital as the temple run's hero, else the screen's hero, else the signed-in one", async () => {
    const forRunHero = screen(quietTemple());
    await forRunHero.apply({ defeated: true });
    jest.advanceTimersByTime(1800);
    expect(forRunHero.router.replace).toHaveBeenCalledWith(hospitalRoute(HERO));

    const forScreenHero = screen(quietTemple(), { progressHeroId: undefined, props: { temple: "t", userId: "u-screen" } });
    await forScreenHero.apply({ defeated: true });
    jest.advanceTimersByTime(1800);
    expect(forScreenHero.router.replace).toHaveBeenCalledWith(hospitalRoute("u-screen"));

    const forSignedIn = screen(quietTemple(), { progressHeroId: undefined, props: { temple: "t" }, userStore: { currentUser: { id: "u-signed" } } });
    await forSignedIn.apply({ defeated: true });
    jest.advanceTimersByTime(1800);
    expect(forSignedIn.router.replace).toHaveBeenCalledWith(hospitalRoute("u-signed"));
  });
});

describe("leaving", () => {
  it("walks out of the temple when it was not cleared", async () => {
    const s = screen(quietTemple());

    await s.apply({ intent: "leave" });

    expect(s.leaveTemple).toHaveBeenCalledTimes(1);
    expect(s.showTempleCleared).not.toHaveBeenCalled();
  });

  it("opens the cleared reveal instead, with no Pegasus when the hero has not freed this temple's", async () => {
    const s = screen(WIND_TEMPLE_ID);

    await s.apply({ intent: "leave", cleared: REWARD });

    expect(s.showTempleCleared).toHaveBeenCalledWith(null, REWARD);
    expect(s.leaveTemple).not.toHaveBeenCalled();
  });

  it("opens the cleared reveal with the Pegasus the hero has already freed here", async () => {
    const freed = pegasusOfTemple(WIND_TEMPLE_ID)!;
    addHero({ pegasi: Array.from({ length: 9 }, (_, index) => index === freed.index) });
    const s = screen(WIND_TEMPLE_ID);

    await s.apply({ intent: "leave", cleared: REWARD });

    expect(s.showTempleCleared).toHaveBeenCalledWith(pegasusView(WIND_TEMPLE_ID), REWARD);
  });

  it("does not look for the hero in another room after it leaves", async () => {
    const s = screen(trapTemple());

    await s.apply({ intent: "leave", moved: true });

    expect(s.leaveTemple).toHaveBeenCalledTimes(1);
    expect(s.openChoiceReveal).not.toHaveBeenCalled();
  });
});

describe("the fight, the chests and the drop", () => {
  it("sends the hero to the temple battle for the room they stand in", async () => {
    const id = quietTemple();
    const s = screen(id);

    await s.apply({ intent: "fight" });

    expect(s.router.push).toHaveBeenCalledWith(templeBattleRoute(HERO, id, "1F", 1, 0)); // column, then row
  });

  it("asks for a profile first when there is no hero to send", async () => {
    const s = screen(quietTemple(), { props: { temple: "t", userId: "" }, userStore: { currentUser: {} } });

    await s.apply({ intent: "fight" });

    expect(s.showTempleMessage).toHaveBeenCalledWith("Choose a profile first");
    expect(s.router.push).not.toHaveBeenCalled();
  });

  it("opens the shut chest, the empty chest and the drop", async () => {
    const s = screen(quietTemple());

    await s.apply({ intent: "openChest" });
    await s.apply({ intent: "emptyChest" });
    await s.apply({ intent: "takeDrop" });

    expect(s.log).toEqual(["chest", "emptyChest", "drop"]);
  });
});

describe("a teleport", () => {
  it("plays the teleport sound, repaints the floor 100 ms later and then meets the room the hero is in", async () => {
    const s = screen(trapTemple());

    await s.apply({ intent: "teleport" });

    expect(s.log).toEqual(["fx:okdesuka", "reveal:sheet"]);
    expect(s.updateBg).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(s.updateBg).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(s.updateBg).toHaveBeenCalledWith(1, 0); // column, then row
  });

  it("fizzles when the circle has no partner: a 'no' and the line, and nowhere to arrive", async () => {
    const s = screen(trapTemple());
    s.handleTeleport.mockReturnValue(false);

    await s.apply({ intent: "teleport" });

    expect(s.log).toEqual(["fx:no", `message:${CIRCLE_FIZZLES}`]);
    jest.advanceTimersByTime(200);
    expect(s.updateBg).not.toHaveBeenCalled();
  });
});

describe("a riddle", () => {
  const puzzleTemple = (): string => quietTemple({ type: "puzzle", content: { puzzleType: "stonePillars" } });
  const riddle = { id: "stonePillars", question: "What am I?", choices: ["A shadow", "A door", "A pillar"] };

  it("opens the choice reveal with the question and every choice, keyed by its index", async () => {
    const s = screen(puzzleTemple());

    await s.apply({ intent: "riddle", riddle });

    expect(s.log).toEqual(["reveal:riddle"]);
    expect(lastReveal(s.openChoiceReveal)).toMatchObject({
      kind: "riddle",
      title: "The Glyphs",
      body: "What am I?",
      choices: [
        { id: "0", label: "A shadow" },
        { id: "1", label: "A door" },
        { id: "2", label: "A pillar" },
      ],
    });
  });

  it("leaves a faded choice out, the others keeping their index", async () => {
    const s = screen(puzzleTemple());

    await s.apply({ intent: "riddle", riddle: { ...riddle, faded: [0] } });

    expect(lastReveal(s.openChoiceReveal).choices).toEqual([
      { id: "1", label: "A door" },
      { id: "2", label: "A pillar" },
    ]);
  });

  it("answers with the chosen index, and the answer's outcome is shown in turn", async () => {
    const s = screen(puzzleTemple());
    await s.apply({ intent: "riddle", riddle });
    s.log.length = 0;

    lastReveal(s.openChoiceReveal).onChoose("0"); // a wrong answer: the wall glows hot
    await tick();

    expect(s.log).toEqual([expect.stringMatching(/^fx:/), "say:Wrong. The wall glows hot."]);
    expect(hp()).toBe(27);
    expect(s.outcomes.isShaking.value).toBe(true);
  });

  it("opens nothing without a riddle in the outcome, or when the temple has no hero standing in it", async () => {
    const noRiddle = screen(puzzleTemple());
    await noRiddle.apply({ intent: "riddle" });
    expect(noRiddle.openChoiceReveal).not.toHaveBeenCalled();

    const noHero = screen(puzzleTemple(), { progressHeroId: undefined });
    await noHero.apply({ intent: "riddle", riddle });
    expect(noHero.openChoiceReveal).not.toHaveBeenCalled();
  });
});

describe("a shop", () => {
  const wares = [
    { id: "bomb", name: "Bomb", price: 20, blurb: "blows open a cracked wall" },
    { id: "special:Gem", name: "Gem", price: 50, blurb: "a rare find", soldOut: true },
  ];

  it("opens the choice reveal with the wares, their prices and what the hero carries", async () => {
    const s = screen(quietTemple({ type: "shop" }));

    await s.apply({ intent: "shop", wares, gp: 100 });

    expect(s.log).toEqual(["reveal:shop"]);
    expect(lastReveal(s.openChoiceReveal)).toMatchObject({
      kind: "shop",
      title: "Wares",
      subtitle: "You carry 100 GP",
      choices: [
        { id: "bomb", label: "Bomb", hint: "blows open a cracked wall", price: 20, disabled: false },
        { id: "special:Gem", label: "Gem", hint: "a rare find", price: 50, disabled: true },
      ],
    });
  });

  it("counts the hero's GP as 0 when the outcome does not say", async () => {
    const s = screen(quietTemple({ type: "shop" }));

    await s.apply({ intent: "shop", wares });

    expect(lastReveal(s.openChoiceReveal).subtitle).toBe("You carry 0 GP");
  });

  it("buys the chosen ware and shows what came of it", async () => {
    const s = screen(quietTemple({ type: "shop" }));
    await s.apply({ intent: "shop", wares, gp: 100 });
    s.log.length = 0;

    lastReveal(s.openChoiceReveal).onChoose("nothing-like-it");
    await tick();

    expect(s.log).toEqual([expect.stringMatching(/^fx:/), "say:We do not carry that."]);
  });

  it("opens nothing without wares in the outcome, or when no hero stands in the temple", async () => {
    const noWares = screen(quietTemple({ type: "shop" }));
    await noWares.apply({ intent: "shop" });
    expect(noWares.openChoiceReveal).not.toHaveBeenCalled();

    const noHero = screen(quietTemple({ type: "shop" }), { progressHeroId: undefined });
    await noHero.apply({ intent: "shop", wares });
    expect(noHero.openChoiceReveal).not.toHaveBeenCalled();
  });
});

describe("the room's sheet", () => {
  it("opens the sheet of the room the hero stands in, with its actions and a Back", async () => {
    const s = screen(trapTemple());

    await s.apply({ intent: "sheet" });

    expect(s.log).toEqual(["reveal:sheet"]);
    expect(lastReveal(s.openChoiceReveal)).toMatchObject({
      kind: "sheet",
      cancelLabel: "Back",
      choices: [
        { id: "0", label: "Jump across" },
        { id: "1", label: "Walk through" },
      ],
    });
  });

  it("opens the exit at the entrance", async () => {
    const s = screen(quietTemple({ type: "empty" }, [0, 0]), {}, [0, 0]);

    await s.apply({ intent: "sheet" });

    expect(lastReveal(s.openChoiceReveal)).toMatchObject({ kind: "exit", choices: [{ id: "0", label: "Leave Temple" }] });
  });

  it("asks for a profile first when no hero stands in the temple", async () => {
    const s = screen(trapTemple(), { progressHeroId: undefined });

    await s.apply({ intent: "sheet" });

    expect(s.log).toEqual(["message:Choose a profile first"]);
  });
});

describe("a hero who was moved", () => {
  it("is met by the room they landed in, after the rest of the outcome", async () => {
    const s = screen(trapTemple());

    await s.apply({ sound: "thud", message: "You fall.", intent: "openChest", moved: true });

    expect(s.log).toEqual(["fx:thud", "say:You fall.", "chest", "reveal:sheet"]);
  });

  it("is not met by anything in a room that waits to be acted on", async () => {
    const s = screen(quietTemple());

    await s.apply({ moved: true });

    expect(s.log).toEqual([]);
  });

  it("is not met at all when the outcome does not say they moved", async () => {
    const s = screen(trapTemple());

    await s.apply({ message: "Nothing moved." });

    expect(s.log).toEqual(["say:Nothing moved."]);
  });

  it("is met by the room they walk into: handleArrival applies that room's outcome", async () => {
    const s = screen(trapTemple());

    await s.outcomes.handleArrival();

    expect(s.log).toEqual(["reveal:sheet"]);
  });
});
