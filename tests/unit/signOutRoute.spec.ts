import { createPinia, setActivePinia } from "pinia";
import { goAfterSignOut, signOutRoute } from "@/router/signOutRoute";
import { useFamilyStore } from "@/lib/store/stores/family";

describe("where Save & Quit lands", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("is the profile picker on a device that is not a kid phone", () => {
    expect(signOutRoute(false)).toEqual({ name: "xp-profile" });
  });

  it("is the hero-phone screen, with the hero's card, on a kid phone", () => {
    expect(signOutRoute(true)).toEqual({ name: "hero-phone" });
  });

  it("follows the family store when it takes the way", () => {
    const replace = jest.fn();

    goAfterSignOut({ replace });
    expect(replace).toHaveBeenLastCalledWith({ name: "xp-profile" });

    useFamilyStore().device = { heroId: "hero-1", label: "Mia's phone" } as never;
    goAfterSignOut({ replace });
    expect(replace).toHaveBeenLastCalledWith({ name: "hero-phone" });
  });
});
