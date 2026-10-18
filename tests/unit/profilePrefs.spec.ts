import {
  guidesOn,
  landingChoiceOf,
  landingOptionsFor,
  landingPathFor,
  setGuidesOn,
  setLandingChoice,
} from "@/lib/services/core/profilePrefs";

describe("Profile start-up choices", () => {
  beforeEach(() => localStorage.clear());

  it("lands on My Home until the profile picks another screen", () => {
    expect(landingChoiceOf("hero-1")).toBe("my-home");
    setLandingChoice("hero-1", "world-map");
    expect(landingChoiceOf("hero-1")).toBe("world-map");
    expect(landingChoiceOf("hero-2")).toBe("my-home");
  });

  it("sends the profile to the screen it chose", () => {
    expect(landingPathFor({ id: "hero-1" }, "home-town")).toBe("/my-portal/hero-1/home-town");
    expect(landingPathFor({ id: 7, isAdult: true }, "game-master")).toBe("/game-master/dashboard");
  });

  it("offers the Game Master console only to a Game Master, and lands a hero at home if it was picked", () => {
    expect(landingOptionsFor(false).map((option) => option.value)).not.toContain("game-master");
    expect(landingOptionsFor(true).map((option) => option.value)).toContain("game-master");
    expect(landingPathFor({ id: "hero-1", isAdult: false }, "game-master")).toBe("/my-portal/hero-1/my-home");
  });

  it("ignores a stored choice it does not know", () => {
    localStorage.setItem("xp.landing.hero-1", "the-moon");
    expect(landingChoiceOf("hero-1")).toBe("my-home");
  });

  it("keeps the Guide speaking unless the profile turns it off", () => {
    expect(guidesOn("hero-1")).toBe(true);
    setGuidesOn("hero-1", false);
    expect(guidesOn("hero-1")).toBe(false);
    expect(guidesOn("hero-2")).toBe(true);
    setGuidesOn("hero-1", true);
    expect(guidesOn("hero-1")).toBe(true);
  });
});
