import { TownHallError } from "@/lib/services/townhall/townHallClient";
import { courierLatePrompt } from "@/lib/services/hometown/hometownPrompts";
import {
  courierLateOnTheRoadPrompt,
  FAMILY_ROAD_CLOSED_LINE,
  HERO_PHONE_ROAD_CLOSED_LINE,
  isFamilyRoadClosed,
  isFamilyRoadClosedProblem,
} from "@/lib/services/townhall/townHallPrompts";

describe("the family's road to the city", () => {
  it("says in the clerk's world that the road is not open yet and nothing reaches a second phone", () => {
    expect(FAMILY_ROAD_CLOSED_LINE).toBe("The family's road to the city isn't open yet, so nothing will reach a second phone.");
    expect(FAMILY_ROAD_CLOSED_LINE).not.toContain("\u2014");
  });

  it("tells a hero on a phone the same thing in fewer words: the road is not open yet, try again later", () => {
    expect(HERO_PHONE_ROAD_CLOSED_LINE).toBe("The family's road to the city isn't open yet. Try again later.");
    expect(HERO_PHONE_ROAD_CLOSED_LINE).not.toContain("\u2014");
  });

  describe("when it counts as closed", () => {
    it("is closed when the site does not answer or the family server is not there", () => {
      expect(isFamilyRoadClosed(new TownHallError("offline"))).toBe(true);
      expect(isFamilyRoadClosed(new TownHallError("server", "No route was found", 404, "rest_no_route"))).toBe(true);
      expect(isFamilyRoadClosed(new TownHallError("server", "Boom", 500))).toBe(true);
    });

    it("is open when the site answered with a reason of its own", () => {
      expect(isFamilyRoadClosed(new TownHallError("forbidden", "Taken", 403, "xp_family_taken"))).toBe(false);
      expect(isFamilyRoadClosed(new TownHallError("forbidden", "Not a member", 403, "xp_family_not_member"))).toBe(false);
      expect(isFamilyRoadClosed(new TownHallError("unauthorized", "Sign in", 401))).toBe(false);
      expect(isFamilyRoadClosed(new TownHallError("invalid", "Bad", 400))).toBe(false);
      expect(isFamilyRoadClosed(new TownHallError("server", "Slow down", 429))).toBe(false);
    });

    it("is open for anything that is not a Town Hall error", () => {
      expect(isFamilyRoadClosed(new Error("Network failure"))).toBe(false);
      expect(isFamilyRoadClosed(null)).toBe(false);
      expect(isFamilyRoadClosed(undefined)).toBe(false);
    });

    it("reads a stored family problem the same way", () => {
      expect(isFamilyRoadClosedProblem("offline")).toBe(true);
      expect(isFamilyRoadClosedProblem("server")).toBe(true);
      expect(isFamilyRoadClosedProblem("taken")).toBe(false);
      expect(isFamilyRoadClosedProblem("not-member")).toBe(false);
      expect(isFamilyRoadClosedProblem(null)).toBe(false);
      expect(isFamilyRoadClosedProblem(undefined)).toBe(false);
    });
  });

  describe("the clerk when the courier is late", () => {
    it("keeps the courier line and the two answers, and adds what it means", () => {
      const late = courierLatePrompt();
      const prompt = courierLateOnTheRoadPrompt();
      expect(prompt.lines).toEqual([...late.lines, FAMILY_ROAD_CLOSED_LINE]);
      expect(prompt.lines[0]).toBe("*peers out the window* The courier hasn't arrived from the city yet.");
      expect(prompt.speaker).toBe(late.speaker);
      expect(prompt.accent).toBe("townHall");
      expect(prompt.sprite).toBe("tablet");
      expect(prompt.cancelId).toBe("never");
      expect(prompt.choices.map((choice) => choice.id)).toEqual(["retry", "never"]);
    });

    it("does not change the plain courier prompt other screens may use", () => {
      expect(courierLatePrompt().lines).toHaveLength(1);
    });
  });
});
