import { problemText } from "@/lib/services/party/partyProblemText";
import type { PartyProblem } from "@/lib/services/party/partyClient";

const ALL: PartyProblem[] = [
  "pro-required",
  "unlinked",
  "offline",
  "server",
  "invalid",
  "rate-limited",
  "not-member",
  "code-unknown",
  "blocked",
  "already-member",
  "request-pending",
  "forbidden",
  "raid-running",
  "too-small",
  "stale",
  "gone",
  "busy",
];

describe("problemText", () => {
  it("has plain words for every problem, none of them empty", () => {
    for (const problem of ALL) expect(problemText(problem).trim().length).toBeGreaterThan(8);
  });

  it("says what to do about the ones the family can fix", () => {
    expect(problemText("pro-required")).toContain("XP Pro");
    expect(problemText("unlinked")).toContain("Town Hall");
    expect(problemText("code-unknown")).toContain("code");
    expect(problemText("forbidden")).toContain("home");
  });

  it("has a kind fallback for a problem it does not know", () => {
    expect(problemText("something-new" as PartyProblem)).toBe(problemText("server"));
  });
});
