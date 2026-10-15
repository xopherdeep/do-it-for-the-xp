import { FAB_OPENING_MS, isFabOpening } from "@/app/Console/MyPortal/UserHud/MyTask/fabOpening";

describe("isFabOpening", () => {
  const openedAt = 10_000;

  it("is false until the menu has opened by itself", () => {
    expect(isFabOpening(0, 10_000)).toBe(false);
  });

  it("is true from the moment it opens until the window closes", () => {
    expect(isFabOpening(openedAt, openedAt)).toBe(true);
    expect(isFabOpening(openedAt, openedAt + 400)).toBe(true);
    expect(isFabOpening(openedAt, openedAt + FAB_OPENING_MS - 1)).toBe(true);
  });

  it("is false once the window has passed, so a later tap closes the menu as usual", () => {
    expect(isFabOpening(openedAt, openedAt + FAB_OPENING_MS)).toBe(false);
    expect(isFabOpening(openedAt, openedAt + 60_000)).toBe(false);
  });

  it("is false for a clock that reads before the menu opened", () => {
    expect(isFabOpening(openedAt, openedAt - 1)).toBe(false);
  });

  it("takes a different window", () => {
    expect(isFabOpening(openedAt, openedAt + 900, 800)).toBe(false);
    expect(isFabOpening(openedAt, openedAt + 700, 800)).toBe(true);
  });
});
