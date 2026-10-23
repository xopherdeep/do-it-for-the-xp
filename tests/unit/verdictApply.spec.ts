import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { ClaimSettled } from "@/lib/services/multiplayer/familyEvents";
import { applyVerdict, type VerdictDeps } from "@/lib/services/sync/verdictApply";

/**
 * A Game Master's verdict applied on the device holding the hero's turn (family sync, section 6): read the entry, settle
 * it once. The quest log is a map here; approve and reject settle it the way approveCompletion and rejectCompletion do.
 */

const pendingEntry = (id: string): QuestLogEntry =>
  ({ id, questId: "q-dishes", questName: "Dishes", userId: "mia", status: "pending", source: "claim", rewards: { xp: 30, gp: 40, ap: 2 }, completedAt: "2026-10-22T09:00:00.000Z" }) as QuestLogEntry;

const verdict = (status: ClaimSettled["status"], over: Partial<ClaimSettled> = {}): ClaimSettled => ({
  claimId: "entry-1",
  questId: "q-dishes",
  status,
  note: "",
  xp: 0,
  gp: 0,
  ap: 0,
  ...over,
});

/** The quest log, with approve and reject that settle an entry as the completion service does */
const questLog = (entries: QuestLogEntry[]) => {
  const log = new Map(entries.map((entry) => [entry.id, { ...entry }]));
  const deps: VerdictDeps & { approve: jest.Mock; reject: jest.Mock } = {
    entry: async (id) => log.get(id) ?? null,
    approve: jest.fn(async (id: string) => {
      const entry = log.get(id) as QuestLogEntry;
      entry.status = "approved";
      entry.rewardsApplied = true;
      return entry;
    }),
    reject: jest.fn(async (id: string, note: string) => {
      const entry = log.get(id) as QuestLogEntry;
      entry.status = "rejected";
      entry.note = note;
      return entry;
    }),
  };
  return { log, deps };
};

describe("applying a verdict", () => {
  it("applies an approval once; a repeat answers already", async () => {
    const { log, deps } = questLog([pendingEntry("entry-1")]);

    expect(await applyVerdict(verdict("approved"), deps)).toBe("applied");
    expect(deps.approve).toHaveBeenCalledWith("entry-1");
    expect(log.get("entry-1")).toMatchObject({ status: "approved", rewardsApplied: true });

    // the same event read again, or the other Game Master's verdict on the same claim: nothing is paid twice
    expect(await applyVerdict(verdict("approved"), deps)).toBe("already");
    expect(await applyVerdict(verdict("rejected", { note: "Too late" }), deps)).toBe("already");
    expect(deps.approve).toHaveBeenCalledTimes(1);
    expect(deps.reject).not.toHaveBeenCalled();
  });

  it("a rejection carries the note", async () => {
    const { log, deps } = questLog([pendingEntry("entry-1")]);

    expect(await applyVerdict(verdict("rejected", { note: "Still a pan in the sink" }), deps)).toBe("applied");

    expect(deps.reject).toHaveBeenCalledWith("entry-1", "Still a pan in the sink");
    expect(log.get("entry-1")).toMatchObject({ status: "rejected", note: "Still a pan in the sink" });
    expect(deps.approve).not.toHaveBeenCalled();
  });

  it("missing when the entry is not here yet", async () => {
    const { deps } = questLog([]);

    expect(await applyVerdict(verdict("approved"), deps)).toBe("missing");
    expect(deps.approve).not.toHaveBeenCalled();
  });

  it("a pending answer has nothing to apply", async () => {
    const { log, deps } = questLog([pendingEntry("entry-1")]);

    expect(await applyVerdict(verdict("pending"), deps)).toBe("already");
    expect(log.get("entry-1")?.status).toBe("pending");
    expect(deps.approve).not.toHaveBeenCalled();
    expect(deps.reject).not.toHaveBeenCalled();
  });

  it("settles the entry the lookup found, by its own id", async () => {
    // a verdict named by the phone claim id the entry was made from finds the entry and settles it by the entry's id
    const { deps } = questLog([pendingEntry("entry-1")]);
    const byPhoneClaim: VerdictDeps = { ...deps, entry: async (id) => (id === "phone-claim-7" ? deps.entry("entry-1") : null) };

    expect(await applyVerdict(verdict("approved", { claimId: "phone-claim-7" }), byPhoneClaim)).toBe("applied");
    expect(deps.approve).toHaveBeenCalledWith("entry-1");
  });
});
