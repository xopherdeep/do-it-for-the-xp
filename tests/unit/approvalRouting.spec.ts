import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  approversFor,
  canReviewClaim,
  gameMasterIds,
  isSoleGameMaster,
  type Roster,
} from "@/lib/services/quests/approvalRouting";
import { claimsFor } from "@/lib/services/quests/waitingClaims";

const family: Roster = {
  mum: { id: "mum", isAdult: true },
  dad: { id: "dad", isAdult: true },
  kid: { id: "kid", isAdult: false },
};
const soloGm: Roster = { mum: { id: "mum", isAdult: true }, kid: { id: "kid" } };

describe("approvalRouting", () => {
  it("finds the Game Masters on the device", () => {
    expect(gameMasterIds(family)).toEqual(["mum", "dad"]);
  });

  it("sends a hero's claim to every Game Master, and a Game Master's to the others", () => {
    expect(approversFor("kid", family)).toEqual(["mum", "dad"]);
    expect(approversFor("mum", family)).toEqual(["dad"]);
  });

  it("knows a Game Master with nobody else to ask", () => {
    expect(isSoleGameMaster("mum", soloGm)).toBe(true);
    expect(isSoleGameMaster("mum", family)).toBe(false);
    expect(isSoleGameMaster("kid", soloGm)).toBe(false);
  });

  it("never lets a Game Master settle their own claim when another could", () => {
    expect(canReviewClaim("mum", "mum", family)).toBe(false);
    expect(canReviewClaim("dad", "mum", family)).toBe(true);
    expect(canReviewClaim("mum", "kid", family)).toBe(true);
  });

  it("lets the only Game Master settle their own claim", () => {
    expect(canReviewClaim("mum", "mum", soloGm)).toBe(true);
  });
});

describe("claimsFor", () => {
  const entry = (id: string, userId: string, completedAt: string, status = "pending") =>
    ({ id, userId, completedAt, status } as unknown as QuestLogEntry);

  it("keeps the claims the reviewer may settle, the longest wait first", () => {
    const pending = [
      entry("b", "kid", "2026-10-17T10:00:00Z"),
      entry("own", "mum", "2026-10-17T08:00:00Z"),
      entry("a", "dad", "2026-10-17T09:00:00Z"),
      entry("done", "kid", "2026-10-17T07:00:00Z", "approved"),
    ];
    expect(claimsFor("mum", pending, family).map((claim) => claim.id)).toEqual(["a", "b"]);
  });
});
