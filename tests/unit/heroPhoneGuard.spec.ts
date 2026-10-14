import { handleHeroPhoneGuard } from "@/router/_Guards/heroPhone.guard";

describe("handleHeroPhoneGuard", () => {
  describe("when in kid mode", () => {
    const isKidMode = true;

    it.each([
      ["xp-dashboard"],
      ["my-portal"],
      ["log-in"],
      ["game-master"],
      ["xp-profile"],
      ["settings"],
    ])("redirects %s to hero-phone", (routeName) => {
      const result = handleHeroPhoneGuard({ name: routeName }, isKidMode);
      expect(result).toEqual({ name: "hero-phone" });
    });

    it("redirects when to.name is undefined or missing", () => {
      const result = handleHeroPhoneGuard({}, isKidMode);
      expect(result).toEqual({ name: "hero-phone" });
    });

    it("allows navigation to hero-phone", () => {
      const result = handleHeroPhoneGuard({ name: "hero-phone" }, isKidMode);
      expect(result).toBeUndefined();
    });

    it("allows navigation to link-phone", () => {
      const result = handleHeroPhoneGuard({ name: "link-phone" }, isKidMode);
      expect(result).toBeUndefined();
    });
  });

  describe("when not in kid mode", () => {
    const isKidMode = false;

    it.each([
      ["xp-dashboard"],
      ["my-portal"],
      ["log-in"],
      ["hero-phone"],
      ["link-phone"],
      ["game-master"],
    ])("allows navigation to %s", (routeName) => {
      const result = handleHeroPhoneGuard({ name: routeName }, isKidMode);
      expect(result).toBeUndefined();
    });

    it("allows navigation when to.name is undefined", () => {
      const result = handleHeroPhoneGuard({}, isKidMode);
      expect(result).toBeUndefined();
    });
  });
});
