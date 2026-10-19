import { hasPin, hasUnsealedSecrets, isSealed, pinMatches, sealProfileSecrets, sealSecret, secretMatches, sha256 } from "@/lib/services/profile/pinSeal";
import { FIRST_LOCK_MS, FREE_TRIES, MAX_LOCK_MS, NO_LOCKOUT, formatWait, lockMsAfter, msLeft, readLockout, recordWrongTry, saveLockout } from "@/lib/services/profile/pinLockout";
import {
  RECOVERY_DELIVERED,
  canReissueRecoveryCode,
  hasRecoveryCode,
  issueRecoveryCode,
  mintRecoveryCode,
  needsRecoveryCodeShown,
  normalizeRecoveryCode,
  recoveryCodeMatches,
  sealRecoveryCode,
} from "@/lib/services/profile/pinRecovery";

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const ascii = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

describe("sealing a PIN", () => {
  it("hashes with SHA-256", () => {
    expect(hex(sha256(new Uint8Array(0)))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(ascii("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("never stores the digits, salts every seal, and still opens with the right PIN", () => {
    const a = sealSecret("1234");
    const b = sealSecret("1234");
    expect(isSealed(a)).toBe(true);
    expect(a).not.toContain("1234");
    expect(a).not.toBe(b);
    expect(secretMatches(a, "1234")).toBe(true);
    expect(secretMatches(b, "1234")).toBe(true);
    expect(secretMatches(a, "1235")).toBe(false);
    expect(sealSecret(a)).toBe(a);
  });

  it("still opens a profile saved before sealing", () => {
    expect(pinMatches({ passcode: "0000" }, "0000")).toBe(true);
    expect(pinMatches({ passcode: "0000" }, "000")).toBe(false);
    expect(pinMatches({ passcode: "" }, "")).toBe(false);
    expect(hasPin({ passcode: "" })).toBe(false);
  });

  it("seals a profile's PIN and recovery code and leaves the rest alone", () => {
    const profile = { id: "dad", isAdult: true, passcode: "4321", pinRecovery: "ABCD2345" };
    const sealed = sealProfileSecrets(profile);
    expect(hasUnsealedSecrets(profile)).toBe(true);
    expect(hasUnsealedSecrets(sealed)).toBe(false);
    expect(sealed).toMatchObject({ id: "dad", isAdult: true });
    expect(JSON.stringify(sealed)).not.toMatch(/4321|ABCD2345/);
    expect(pinMatches(sealed, "4321")).toBe(true);
    const noPin = { id: "mia", passcode: "" };
    expect(sealProfileSecrets(noPin)).toBe(noPin);
  });
});

describe("the PIN pad lockout", () => {
  it("allows a few tries, then waits, doubling up to a cap", () => {
    expect(lockMsAfter(FREE_TRIES - 1)).toBe(0);
    expect(lockMsAfter(FREE_TRIES)).toBe(FIRST_LOCK_MS);
    expect(lockMsAfter(FREE_TRIES + 1)).toBe(FIRST_LOCK_MS * 2);
    expect(lockMsAfter(FREE_TRIES + 20)).toBe(MAX_LOCK_MS);
  });

  it("counts wrong tries and says how long is left", () => {
    let state = NO_LOCKOUT;
    for (let i = 0; i < FREE_TRIES - 1; i++) state = recordWrongTry(state, 1000);
    expect(msLeft(state, 1000)).toBe(0);
    state = recordWrongTry(state, 1000);
    expect(msLeft(state, 1000)).toBe(FIRST_LOCK_MS);
    expect(msLeft(state, 1000 + FIRST_LOCK_MS)).toBe(0);
    expect(formatWait(27_000)).toBe("0:27");
    expect(formatWait(245_000)).toBe("4:05");
  });

  it("is kept per profile across opening and closing the pad, and a clean state clears it", () => {
    localStorage.clear();
    saveLockout("dad", { fails: 6, lockedUntil: 99 });
    expect(readLockout("dad")).toEqual({ fails: 6, lockedUntil: 99 });
    expect(readLockout("mia")).toEqual(NO_LOCKOUT);
    saveLockout("dad", NO_LOCKOUT);
    expect(readLockout("dad")).toEqual(NO_LOCKOUT);
  });
});

describe("recovery codes", () => {
  it("are 8 easy-to-read characters", () => {
    const code = mintRecoveryCode();
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it("match however they are typed, and are stored sealed", () => {
    const profile = { pinRecovery: sealRecoveryCode("7KQ3-M9TW") };
    expect(hasRecoveryCode(profile)).toBe(true);
    expect(profile.pinRecovery).not.toContain("7KQ3");
    expect(recoveryCodeMatches(profile, "7kq3 m9tw")).toBe(true);
    expect(recoveryCodeMatches(profile, "7KQ3-M9TX")).toBe(false);
    expect(recoveryCodeMatches({}, "7KQ3-M9TW")).toBe(false);
    expect(normalizeRecoveryCode(" ab-cd ")).toBe("ABCD");
  });
});

describe("a recovery code counts as delivered only when the Game Master says they wrote it down", () => {
  const dad = { id: "dad", isAdult: true, passcode: sealSecret("4321") };

  it("asks a Game Master with no code for one, and never a hero", () => {
    expect(needsRecoveryCodeShown(dad)).toBe(true);
    expect(needsRecoveryCodeShown({ id: "mia", isAdult: false })).toBe(false);
    expect(needsRecoveryCodeShown(undefined)).toBe(false);
  });

  it("a code saved but not yet confirmed is handed over again on every unlock", () => {
    const issued = issueRecoveryCode("7KQ3-M9TW");
    const closedMidDialog = { ...dad, ...issued.fields };
    expect(issued.code).toBe("7KQ3-M9TW");
    expect(closedMidDialog.pinRecoveryPending).toBe(true);
    expect(needsRecoveryCodeShown(closedMidDialog)).toBe(true);
    expect(needsRecoveryCodeShown(closedMidDialog)).toBe(true);
  });

  it("the replacement for an unconfirmed code works and the unconfirmed one stops", () => {
    const first = issueRecoveryCode("7KQ3-M9TW");
    const afterFirst = { ...dad, ...first.fields };
    const second = issueRecoveryCode("ZZZ2-3456");
    const afterSecond = { ...afterFirst, ...second.fields };
    expect(recoveryCodeMatches(afterFirst, first.code)).toBe(true);
    expect(recoveryCodeMatches(afterSecond, first.code)).toBe(false);
    expect(recoveryCodeMatches(afterSecond, second.code)).toBe(true);
    expect(needsRecoveryCodeShown(afterSecond)).toBe(true);
  });

  it("once confirmed the code is not shown again and still works", () => {
    const issued = issueRecoveryCode();
    const confirmed = { ...dad, ...issued.fields, ...RECOVERY_DELIVERED };
    expect(needsRecoveryCodeShown(confirmed)).toBe(false);
    expect(recoveryCodeMatches(confirmed, issued.code)).toBe(true);
  });

  it("a reissue gives a new code, the old one stops working, and the same confirm gate applies", () => {
    const old = issueRecoveryCode("7KQ3-M9TW");
    const delivered = { ...dad, ...old.fields, ...RECOVERY_DELIVERED };
    const fresh = issueRecoveryCode("MNP2-4567");
    const reissued = { ...delivered, ...fresh.fields };
    expect(fresh.code).not.toBe(old.code);
    expect(recoveryCodeMatches(reissued, old.code)).toBe(false);
    expect(recoveryCodeMatches(reissued, fresh.code)).toBe(true);
    expect(needsRecoveryCodeShown(reissued)).toBe(true);
    expect(needsRecoveryCodeShown({ ...reissued, ...RECOVERY_DELIVERED })).toBe(false);
  });

  it("a code saved before the confirm mark existed counts as delivered", () => {
    const legacy = { ...dad, pinRecovery: sealRecoveryCode("7KQ3-M9TW") };
    expect(hasRecoveryCode(legacy)).toBe(true);
    expect(needsRecoveryCodeShown(legacy)).toBe(false);
  });

  it("keeps the code sealed: only the hash is saved, never the code as shown", () => {
    const issued = issueRecoveryCode("7KQ3-M9TW");
    expect(isSealed(issued.fields.pinRecovery)).toBe(true);
    expect(JSON.stringify(issued.fields)).not.toMatch(/7KQ3|M9TW/);
    expect(hasUnsealedSecrets({ ...dad, ...issued.fields })).toBe(false);
  });
});

describe("who may make a new recovery code", () => {
  const users = { dad: { isAdult: true }, mia: { isAdult: false } };

  it("a signed-in Game Master may", () => {
    expect(canReissueRecoveryCode({ currentUser: { id: "dad" }, users })).toBe(true);
  });

  it("a hero, a stranger or nobody may not", () => {
    expect(canReissueRecoveryCode({ currentUser: { id: "mia" }, users })).toBe(false);
    expect(canReissueRecoveryCode({ currentUser: { id: "ghost" }, users })).toBe(false);
    expect(canReissueRecoveryCode({ currentUser: { id: null }, users })).toBe(false);
  });

  it("a Game Master masquerading as a hero may not, because the code is theirs, not the hero's", () => {
    expect(canReissueRecoveryCode({ currentUser: { id: "mia", isImpersonating: true }, users })).toBe(false);
  });
});
