import { waitedLabel } from "@/lib/services/quests/waitedLabel";

const NOW = Date.parse("2026-10-17T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("waitedLabel", () => {
  it("says just arrived under a minute", () => {
    expect(waitedLabel(ago(30_000), NOW)).toBe("just arrived");
  });

  it("counts minutes under an hour", () => {
    expect(waitedLabel(ago(5 * 60_000 + 1000), NOW)).toBe("waited 5m");
    expect(waitedLabel(ago(59 * 60_000), NOW)).toBe("waited 59m");
  });

  it("counts whole hours under a day", () => {
    expect(waitedLabel(ago(3 * 3_600_000 + 40 * 60_000), NOW)).toBe("waited 3h");
  });

  it("counts days after that", () => {
    expect(waitedLabel(ago(2 * 86_400_000 + 5000), NOW)).toBe("waited 2d");
  });

  it("is empty for an unreadable or future time", () => {
    expect(waitedLabel("", NOW)).toBe("");
    expect(waitedLabel("nope", NOW)).toBe("");
    expect(waitedLabel(new Date(NOW + 60_000).toISOString(), NOW)).toBe("");
  });
});
