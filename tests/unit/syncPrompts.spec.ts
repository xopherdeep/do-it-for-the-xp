import { CLERK } from "@/lib/services/hometown/hometownPrompts";
import {
  agoOf,
  busyPrompt,
  firstPullPrompt,
  offlinePrompt,
  proRequiredPrompt,
  tookOverPrompt,
} from "@/lib/services/sync/syncPrompts";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const before = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("the clerk's sync prompts", () => {
  it("agoOf", () => {
    expect(agoOf(before(20_000), NOW)).toBe("just now");
    expect(agoOf(before(5 * MINUTE + 30_000), NOW)).toBe("5 min ago");
    expect(agoOf(before(3 * HOUR + 10 * MINUTE), NOW)).toBe("3 h ago");
    expect(agoOf(before(DAY + 2 * HOUR), NOW)).toBe("yesterday");
    expect(agoOf(before(4 * DAY + HOUR), NOW)).toBe("4 days ago");
    // the site cannot say, or a clock runs ahead of this one
    expect(agoOf(null, NOW)).toBe("a while ago");
    expect(agoOf("not a time", NOW)).toBe("a while ago");
    expect(agoOf(new Date(NOW.getTime() + 90_000).toISOString(), NOW)).toBe("just now");
  });

  it("busyPrompt names the device and the time, cancel is later", () => {
    const prompt = busyPrompt("Mia", { label: "Mia's iPhone", lastSeenAt: before(5 * MINUTE) }, NOW);

    expect(prompt.speaker).toBe(CLERK);
    expect(prompt.speaker).toBe("Town Clerk");
    expect(prompt.lines).toEqual(["Mia is still playing on Mia's iPhone (last seen 5 min ago). Play here anyway?"]);
    expect(prompt.choices.map((choice) => [choice.id, choice.label, choice.tone])).toEqual([
      ["play", "Play here", "primary"],
      ["later", "Not now", "ghost"],
    ]);
    expect(prompt.cancelId).toBe("later");

    // a busy answer that names no device still reads as a sentence
    expect(busyPrompt("Mia", { label: " ", lastSeenAt: null }, NOW, "simple").lines).toEqual([
      "Mia is still playing on another device (last seen a while ago). Play here anyway?",
    ]);
  });

  it("tookOverPrompt says which device took the hero and that this one caught up", () => {
    const prompt = tookOverPrompt("Mia", "the family tablet");
    expect(prompt.speaker).toBe(CLERK);
    expect(prompt.lines).toEqual(["The family tablet took over Mia's game while this one was away. This device has caught up."]);
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
    expect(tookOverPrompt("Mia", null).lines).toEqual([
      "Another device took over Mia's game while this one was away. This device has caught up.",
    ]);
  });

  it("the first pull, Pro and offline lines are the clerk's", () => {
    expect(firstPullPrompt(0).lines).toEqual(["Fetching your family's world…"]);
    expect(firstPullPrompt(120).lines).toEqual(["Fetching your family's world… (120)"]);
    // a progress line waits for the pull, not for a tap
    expect(firstPullPrompt(120).choices).toEqual([]);
    expect(proRequiredPrompt().lines).toEqual(["Playing the whole game on this phone needs XP Pro. Ask your Game Master."]);
    expect(offlinePrompt().lines).toEqual(["No signal. Play on; this device tells the others when it's back."]);
    [firstPullPrompt(3), proRequiredPrompt(), offlinePrompt()].forEach((prompt) => expect(prompt.speaker).toBe(CLERK));
  });
});
