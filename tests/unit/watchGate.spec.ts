import { initialTurn, turnReducer } from "@/lib/services/sync/heroTurn";
import type { HeroTurn, TurnEvent, TurnState } from "@/lib/services/sync/heroTurn";
import { heroesToWatch, isHeroWatched } from "@/lib/services/sync/watchGate";

/**
 * The gate of the clocks under Family Sync (spec section 5): a device runs the late-penalty clock only for the heroes it
 * holds (heroesToWatch), and runs the phone reminders and the encounter clock for the hero signed in here unless it knows
 * another device holds that hero (isHeroWatched). Everything stays as it was with sync off.
 */

const syncOf = (isOn: boolean, turns: Record<string, TurnState>) => ({
  isOn,
  holds: (id: string) => turns[id] === "held",
  stateOf: (id: string): TurnState | null => turns[id] ?? null,
});

describe("heroesToWatch", () => {
  it("with sync off, every hero is watched", () => {
    expect(heroesToWatch(["ana", "ben", "cy"], syncOf(false, {}))).toEqual(["ana", "ben", "cy"]);
  });

  it("with sync on, only held heroes are watched", () => {
    expect(heroesToWatch(["ana", "ben", "cy"], syncOf(true, { ana: "resting", ben: "held" }))).toEqual(["ben"]);
  });

  it("with sync on and no turn held, no hero is watched", () => {
    expect(heroesToWatch(["ana", "ben"], syncOf(true, {}))).toEqual([]);
  });
});

describe("isHeroWatched", () => {
  it("with sync off, every hero is watched, signed in or not", () => {
    expect(isHeroWatched("ana", syncOf(false, { ana: "busy" }), "ana")).toBe(true);
    expect(isHeroWatched("ben", syncOf(false, {}), "ana")).toBe(true);
    expect(isHeroWatched("ana", syncOf(false, {}), null)).toBe(true);
  });

  describe("the hero signed in here, with sync on", () => {
    it.each<[string, TurnState | null]>([
      ["held", "held"],
      ["being asked for (the app has just come to the front)", "asking"],
      ["resting (the app has just gone to the background)", "resting"],
      ["no turn on record (a cold start)", null],
    ])("is watched while %s", (_label, state) => {
      const turns: Record<string, TurnState> = state ? { ana: state } : {};
      expect(isHeroWatched("ana", syncOf(true, turns), "ana")).toBe(true);
    });

    it.each<TurnState>(["busy", "takenOver"])("is not watched once the device knows another device holds the hero (%s)", (state) => {
      expect(isHeroWatched("ana", syncOf(true, { ana: state }), "ana")).toBe(false);
    });
  });

  describe("any other hero on the device, with sync on", () => {
    it("is watched only while held", () => {
      expect(isHeroWatched("ben", syncOf(true, { ben: "held" }), "ana")).toBe(true);
    });

    it.each<TurnState | null>(["resting", "asking", "busy", "takenOver", null])("is not watched while %s", (state) => {
      const turns: Record<string, TurnState> = state ? { ben: state } : {};
      expect(isHeroWatched("ben", syncOf(true, turns), "ana")).toBe(false);
    });

    it("is not watched when nobody is signed in", () => {
      expect(isHeroWatched("ben", syncOf(true, {}), null)).toBe(false);
    });
  });

  it("follows a hero who opens and closes the app: watched through held, resting, asking and held again", () => {
    const send = (turn: HeroTurn, e: TurnEvent) => turnReducer(turn, e);
    const watched = (turn: HeroTurn) => isHeroWatched("ana", syncOf(true, { ana: turn.state }), "ana");
    let turn = initialTurn();
    const seen: boolean[] = [watched(turn)]; // cold start
    for (const e of [{ type: "signIn" }, { type: "granted" }, { type: "signOut" }, { type: "signIn" }, { type: "granted" }] as TurnEvent[]) {
      turn = send(turn, e);
      seen.push(watched(turn));
    }
    expect(seen).toEqual([true, true, true, true, true, true]);
  });

  it("stops at the busy answer and the takeover, and goes on when the player plays here anyway", () => {
    const watched = (turn: HeroTurn) => isHeroWatched("ana", syncOf(true, { ana: turn.state }), "ana");
    const busy = turnReducer(turnReducer(initialTurn(), { type: "signIn" }), { type: "busy", device: { label: "Dad's tablet", lastSeenAt: null } });
    expect(watched(busy)).toBe(false);
    expect(watched(turnReducer(busy, { type: "force" }))).toBe(true);

    const takenOver = turnReducer(turnReducer(turnReducer(initialTurn(), { type: "signIn" }), { type: "granted" }), { type: "refused" });
    expect(watched(takenOver)).toBe(false);
  });
});
