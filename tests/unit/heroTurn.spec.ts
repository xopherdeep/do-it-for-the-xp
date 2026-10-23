import { initialTurn, maySend, turnReducer, type HeroTurn, type TurnBusy, type TurnEvent } from "@/lib/services/sync/heroTurn";

const device: TurnBusy = { label: "Mia's iPhone", lastSeenAt: "2026-10-22T09:30:00Z" };

// Walk a turn through events, as the sync store does
const run = (turn: HeroTurn, ...events: TurnEvent[]): HeroTurn => events.reduce(turnReducer, turn);

const asking = (): HeroTurn => run(initialTurn(), { type: "signIn" });
const held = (): HeroTurn => run(asking(), { type: "granted" });
const provisional = (): HeroTurn => run(asking(), { type: "offline" });
const busy = (): HeroTurn => run(asking(), { type: "busy", device });
const takenOver = (): HeroTurn => run(held(), { type: "refused" });

describe("heroTurn", () => {
  it("starts resting, holding nothing", () => {
    expect(initialTurn()).toEqual({ state: "resting", busy: null, provisional: false });
  });

  it("a hero signing in asks for the turn (resting to asking)", () => {
    expect(turnReducer(initialTurn(), { type: "signIn" })).toEqual({ state: "asking", busy: null, provisional: false });
  });

  it("the site granting the turn holds it (asking to held, not provisional)", () => {
    expect(turnReducer(asking(), { type: "granted" })).toEqual({ state: "held", busy: null, provisional: false });
  });

  it("the site answering busy names the other device (asking to busy)", () => {
    expect(turnReducer(asking(), { type: "busy", device })).toEqual({ state: "busy", busy: device, provisional: false });
  });

  it("Play here anyway asks again, and the grant that follows holds it (busy to asking to held)", () => {
    const again = turnReducer(busy(), { type: "force" });
    expect(again).toEqual({ state: "asking", busy: null, provisional: false });
    expect(turnReducer(again, { type: "granted" })).toEqual({ state: "held", busy: null, provisional: false });
  });

  it("saying no goes back to resting (busy to resting)", () => {
    expect(turnReducer(busy(), { type: "decline" })).toEqual({ state: "resting", busy: null, provisional: false });
  });

  it("signing out, switching profile, Save & Quit or the background rests a held turn (held to resting)", () => {
    expect(turnReducer(held(), { type: "signOut" })).toEqual({ state: "resting", busy: null, provisional: false });
  });

  it("signing out while still asking, busy or provisional goes back to resting", () => {
    expect(turnReducer(asking(), { type: "signOut" }).state).toBe("resting");
    expect(turnReducer(busy(), { type: "signOut" })).toEqual({ state: "resting", busy: null, provisional: false });
    expect(turnReducer(provisional(), { type: "signOut" })).toEqual({ state: "resting", busy: null, provisional: false });
  });

  it("coming back to the front with the same hero asks again (resting to asking, then held)", () => {
    const rested = run(held(), { type: "signOut" });
    const back = turnReducer(rested, { type: "signIn" });
    expect(back.state).toBe("asking");
    expect(turnReducer(back, { type: "granted" }).state).toBe("held");
    expect(turnReducer(back, { type: "busy", device }).state).toBe("busy");
  });

  it("being offline while asking plays on, provisionally (asking to held, provisional)", () => {
    expect(turnReducer(asking(), { type: "offline" })).toEqual({ state: "held", busy: null, provisional: true });
  });

  it("the ask retried when back online: a grant confirms a provisional turn", () => {
    expect(turnReducer(provisional(), { type: "granted" })).toEqual({ state: "held", busy: null, provisional: false });
  });

  it("the ask retried when back online: a later busy is shown then (provisional held to busy)", () => {
    expect(turnReducer(provisional(), { type: "busy", device })).toEqual({ state: "busy", busy: device, provisional: false });
  });

  it("the site refusing a record loses the turn (held to takenOver), provisional or not", () => {
    expect(turnReducer(held(), { type: "refused" })).toEqual({ state: "takenOver", busy: null, provisional: false });
    expect(turnReducer(provisional(), { type: "refused" })).toEqual({ state: "takenOver", busy: null, provisional: false });
  });

  it("catching up after a takeover rests (takenOver to resting)", () => {
    expect(turnReducer(takenOver(), { type: "caughtUp" })).toEqual({ state: "resting", busy: null, provisional: false });
  });

  it("an unknown transition leaves the turn unchanged", () => {
    const resting = initialTurn();
    const confirmed = held();
    const offlineHold = provisional();
    const waiting = busy();
    const lost = takenOver();
    const cases: [HeroTurn, TurnEvent][] = [
      [resting, { type: "granted" }],
      [resting, { type: "busy", device }],
      [resting, { type: "force" }],
      [resting, { type: "decline" }],
      [resting, { type: "signOut" }],
      [resting, { type: "offline" }],
      [resting, { type: "refused" }],
      [resting, { type: "caughtUp" }],
      [asking(), { type: "signIn" }],
      [asking(), { type: "force" }],
      [asking(), { type: "decline" }],
      [asking(), { type: "refused" }],
      [asking(), { type: "caughtUp" }],
      [confirmed, { type: "signIn" }],
      [confirmed, { type: "granted" }],
      [confirmed, { type: "busy", device }],
      [confirmed, { type: "force" }],
      [confirmed, { type: "decline" }],
      [confirmed, { type: "offline" }],
      [confirmed, { type: "caughtUp" }],
      [offlineHold, { type: "signIn" }],
      [offlineHold, { type: "offline" }],
      [waiting, { type: "signIn" }],
      [waiting, { type: "granted" }],
      [waiting, { type: "busy", device }],
      [waiting, { type: "offline" }],
      [waiting, { type: "refused" }],
      [waiting, { type: "caughtUp" }],
      [lost, { type: "signIn" }],
      [lost, { type: "granted" }],
      [lost, { type: "busy", device }],
      [lost, { type: "force" }],
      [lost, { type: "decline" }],
      [lost, { type: "signOut" }],
      [lost, { type: "offline" }],
      [lost, { type: "refused" }],
    ];
    cases.forEach(([turn, event]) => {
      expect(turnReducer(turn, event)).toBe(turn);
    });
  });

  it("is pure: the turn it was given is never changed, and the busy device is copied", () => {
    const before = asking();
    const snapshot = JSON.parse(JSON.stringify(before));
    const next = turnReducer(before, { type: "busy", device });
    expect(before).toEqual(snapshot);
    expect(next.busy).toEqual(device);
    expect(next.busy).not.toBe(device);
    expect(initialTurn()).not.toBe(initialTurn());
  });

  it("only a held turn may send records, provisional or not", () => {
    expect(maySend(initialTurn())).toBe(false);
    expect(maySend(asking())).toBe(false);
    expect(maySend(busy())).toBe(false);
    expect(maySend(takenOver())).toBe(false);
    expect(maySend(held())).toBe(true);
    expect(maySend(provisional())).toBe(true);
  });
});
