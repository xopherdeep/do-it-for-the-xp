import {
  DEFAULT_TEXT_SPEED,
  isTextInstant,
  loadTextSpeed,
  pacedLetterMs,
  setTextSpeed,
  textSpeed,
} from "@/lib/utils/textSpeed";

describe("textSpeed", () => {
  beforeEach(() => {
    localStorage.clear();
    textSpeed.value = DEFAULT_TEXT_SPEED;
  });

  it("defaults to Fast, quicker than the authored pace", () => {
    expect(loadTextSpeed()).toBe("fast");
    expect(pacedLetterMs(50)).toBeLessThan(50);
  });

  it("keeps the chosen speed across reloads", () => {
    setTextSpeed("slow");
    expect(textSpeed.value).toBe("slow");
    expect(loadTextSpeed()).toBe("slow");
  });

  it("falls back to the default for an unknown save", () => {
    localStorage.setItem("xp.textSpeed", "ludicrous");
    expect(loadTextSpeed()).toBe(DEFAULT_TEXT_SPEED);
  });

  it("ignores an unknown speed", () => {
    setTextSpeed("ludicrous" as never);
    expect(textSpeed.value).toBe(DEFAULT_TEXT_SPEED);
  });

  it("scales the authored pace: Normal keeps it, Slow stretches it, Instant is zero", () => {
    expect(pacedLetterMs(50, "normal")).toBe(50);
    expect(pacedLetterMs(50, "slow")).toBeGreaterThan(50);
    expect(pacedLetterMs(50, "fast")).toBe(25);
    expect(pacedLetterMs(50, "instant")).toBe(0);
    expect(isTextInstant("instant")).toBe(true);
    expect(isTextInstant("slow")).toBe(false);
  });
});
