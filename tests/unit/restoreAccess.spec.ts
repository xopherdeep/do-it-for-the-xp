import { canRestoreBackup, canRestoreHere } from "@/lib/services/core/restoreAccess";
import type { GmAccess } from "@/router/_Guards/gm.guard";

// The user store and the toast overlay are faked, like in GmGuard.spec: the decision runs without Pinia or Ionic
jest.mock("@ionic/vue", () => ({ toastController: { create: jest.fn() } }));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: jest.fn(),
  IMPERSONATOR_KEY: "xp_impersonator_id",
}));

/*
 * Who may restore a backup:
 *   - a device with no profile at all (a new phone, a cleared browser): anybody, there is nothing to protect yet
 *   - a Game Master signed in (also while masquerading, and on an old install that has no Game Master flag yet)
 *   - nobody else: a hero, or a signed-out device that already has profiles
 */
describe("canRestoreBackup", () => {
  const everyAccess: GmAccess[] = ["game-master", "masquerade", "no-game-master", "denied"];

  it("lets anybody restore on a device with no profiles at all", () => {
    everyAccess.forEach((gmAccess) => {
      expect(canRestoreBackup({ profileCount: 0, gmAccess })).toBe(true);
    });
  });

  it("lets a Game Master restore on a device that has profiles", () => {
    expect(canRestoreBackup({ profileCount: 3, gmAccess: "game-master" })).toBe(true);
    expect(canRestoreBackup({ profileCount: 1, gmAccess: "game-master" })).toBe(true);
  });

  it("keeps the old rule for a masquerading Game Master and for an install that has no Game Master yet", () => {
    expect(canRestoreBackup({ profileCount: 2, gmAccess: "masquerade" })).toBe(true);
    expect(canRestoreBackup({ profileCount: 2, gmAccess: "no-game-master" })).toBe(true);
  });

  it("refuses a hero, or a signed-out device, when the device already has profiles", () => {
    expect(canRestoreBackup({ profileCount: 1, gmAccess: "denied" })).toBe(false);
    expect(canRestoreBackup({ profileCount: 4, gmAccess: "denied" })).toBe(false);
  });

  it("only an exact count of zero opens the door: a broken count never counts as an empty device", () => {
    expect(canRestoreBackup({ profileCount: -1, gmAccess: "denied" })).toBe(false);
    expect(canRestoreBackup({ profileCount: Number.NaN, gmAccess: "denied" })).toBe(false);
    expect(canRestoreBackup({ profileCount: undefined as unknown as number, gmAccess: "denied" })).toBe(false);
  });
});

describe("canRestoreHere (reads the user store)", () => {
  const gm = { id: "gm", isAdult: true };
  const kid = { id: "kid", isAdult: false };
  const view = (id: string | null, users: Record<string, { id: string; isAdult?: unknown }>) => ({
    currentUser: { id },
    users,
  });

  it("is open on an empty device, signed in or not", () => {
    expect(canRestoreHere(view(null, {}))).toBe(true);
  });

  it("is open to the Game Master who is signed in", () => {
    expect(canRestoreHere(view("gm", { gm, kid }))).toBe(true);
  });

  it("is shut to a hero when a Game Master exists", () => {
    expect(canRestoreHere(view("kid", { gm, kid }))).toBe(false);
  });

  it("is shut to a signed-out device that already has profiles", () => {
    expect(canRestoreHere(view(null, { gm, kid }))).toBe(false);
  });

  it("answers again when the store changes: a reload no longer leaves a stale answer", () => {
    const store = view(null, { gm, kid });
    expect(canRestoreHere(store)).toBe(false);
    store.currentUser = { id: "gm" };
    expect(canRestoreHere(store)).toBe(true);
  });
});
