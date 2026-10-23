import { handleHeroPhoneGuard } from "@/router/_Guards/heroPhone.guard";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";

describe("handleHeroPhoneGuard", () => {
  describe("when in kid mode", () => {
    const isKidMode = true;
    const isFullPortal = false;

    it.each([
      ["xp-dashboard"],
      ["my-portal"],
      ["log-in"],
      ["game-master"],
      ["xp-profile"],
      ["settings"],
    ])("redirects %s to hero-phone", (routeName) => {
      const result = handleHeroPhoneGuard({ name: routeName }, isKidMode, isFullPortal);
      expect(result).toEqual({ name: "hero-phone" });
    });

    it("redirects when to.name is undefined or missing", () => {
      const result = handleHeroPhoneGuard({}, isKidMode, isFullPortal);
      expect(result).toEqual({ name: "hero-phone" });
    });

    it("allows navigation to hero-phone", () => {
      const result = handleHeroPhoneGuard({ name: "hero-phone" }, isKidMode, isFullPortal);
      expect(result).toBeUndefined();
    });

    it("allows navigation to link-phone", () => {
      const result = handleHeroPhoneGuard({ name: "link-phone" }, isKidMode, isFullPortal);
      expect(result).toBeUndefined();
    });
  });

  describe("when not in kid mode", () => {
    const isKidMode = false;
    const isFullPortal = false;

    it.each([
      ["xp-dashboard"],
      ["my-portal"],
      ["log-in"],
      ["hero-phone"],
      ["link-phone"],
      ["game-master"],
    ])("allows navigation to %s", (routeName) => {
      const result = handleHeroPhoneGuard({ name: routeName }, isKidMode, isFullPortal);
      expect(result).toBeUndefined();
    });

    it("allows navigation when to.name is undefined", () => {
      const result = handleHeroPhoneGuard({}, isKidMode, isFullPortal);
      expect(result).toBeUndefined();
    });
  });

  describe("when the phone is a full portal (Pro, linked, first pull done)", () => {
    const isKidMode = true;
    const isFullPortal = true;

    it.each([["xp-dashboard"], ["my-portal"], ["my-home"], ["log-in"], ["xp-profile"], ["settings"], ["hero-phone"], ["link-phone"]])(
      "a full portal passes every route: %s",
      (routeName) => {
        expect(handleHeroPhoneGuard({ name: routeName }, isKidMode, isFullPortal)).toBeUndefined();
      }
    );

    it("a full portal passes a route with no name", () => {
      expect(handleHeroPhoneGuard({}, isKidMode, isFullPortal)).toBeUndefined();
    });

    it("leaves the Game Master console to the Game Master guard, which stays shut in kid mode", () => {
      expect(handleHeroPhoneGuard({ name: "game-master" }, isKidMode, isFullPortal)).toBeUndefined();
      const gameMaster = { id: "mom", isAdult: true };
      const view = { currentUser: { id: "mom", isImpersonating: false }, users: { mom: gameMaster } };
      expect(canAccessGameMaster(view as never, isKidMode)).toBe(false);
    });
  });

  describe("kid mode without the portal", () => {
    it("kid mode without the portal still redirects", () => {
      expect(handleHeroPhoneGuard({ name: "my-portal" }, true, false)).toEqual({ name: "hero-phone" });
      expect(handleHeroPhoneGuard({ name: "xp-profile" }, true, false)).toEqual({ name: "hero-phone" });
    });

    it("a device that is not in kid mode ignores the portal flag", () => {
      expect(handleHeroPhoneGuard({ name: "hero-phone" }, false, true)).toBeUndefined();
      expect(handleHeroPhoneGuard({ name: "my-portal" }, false, false)).toBeUndefined();
    });
  });
});
