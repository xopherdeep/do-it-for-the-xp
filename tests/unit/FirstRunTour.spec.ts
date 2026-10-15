jest.mock("@/assets/fx", () => ({ play$fx: jest.fn() }));
jest.mock("@capacitor/haptics", () => ({
  Haptics: { impact: jest.fn().mockResolvedValue(undefined), notification: jest.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));

import { mount } from "@vue/test-utils";
import XpFirstRunTour from "@/components/organisms/FirstRunTour/XpFirstRunTour.vue";
import {
  FIRST_RUN_TOUR,
  hasSeenTour,
  markTourSeen,
  resetTour,
  visibleStops,
} from "@/lib/services/tutorial/firstRunTour";

beforeEach(() => localStorage.clear());

describe("firstRunTour", () => {
  it("is unseen for a new hero, seen once marked, and unseen again after a reset", () => {
    expect(hasSeenTour("h1")).toBe(false);
    markTourSeen("h1");
    expect(hasSeenTour("h1")).toBe(true);
    expect(hasSeenTour("h2")).toBe(false);
    resetTour("h1");
    expect(hasSeenTour("h1")).toBe(false);
  });

  it("never runs without a hero", () => {
    expect(hasSeenTour("")).toBe(true);
  });

  it("skips stops whose mark is not on screen", () => {
    const stops = visibleStops(FIRST_RUN_TOUR, (target) => target !== "party");
    expect(stops.map((stop) => stop.target)).not.toContain("party");
    expect(stops.length).toBe(FIRST_RUN_TOUR.length - 1);
  });

  it("starts at the XP and GP bar and ends sending the hero to their quests", () => {
    expect(FIRST_RUN_TOUR[0].target).toBe("purse");
    expect(FIRST_RUN_TOUR[FIRST_RUN_TOUR.length - 1].lines.join(" ")).toMatch(/My Quests/);
  });
});

describe("XpFirstRunTour", () => {
  const marks = ["purse", "hands", "profile", "area", "party"];
  let targets: HTMLElement[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    targets = marks.map((mark) => {
      const el = document.createElement("button");
      el.dataset.tour = mark;
      el.getBoundingClientRect = () => ({ top: 700, left: 10, width: 60, height: 50, right: 70, bottom: 750, x: 10, y: 700, toJSON: () => ({}) });
      document.body.appendChild(el);
      return el;
    });
  });

  afterEach(() => {
    targets.forEach((el) => el.remove());
    document.body.querySelectorAll("[data-cy=first-run-tour]").forEach((el) => el.remove());
    jest.useRealTimers();
  });

  const tour = () => document.body.querySelector("[data-cy=first-run-tour]");
  const click = async (cy: string) => {
    (document.body.querySelector(`[data-cy=${cy}]`) as HTMLButtonElement).click();
    await Promise.resolve();
  };

  it("walks every stop and remembers the hero saw it", async () => {
    const wrapper = mount(XpFirstRunTour, { props: { heroId: "h1" }, attachTo: document.body });
    jest.runOnlyPendingTimers();
    await wrapper.vm.$nextTick();
    expect(tour()).not.toBeNull();
    for (let n = 0; n < FIRST_RUN_TOUR.length; n++) {
      await click("tour-next");
      await wrapper.vm.$nextTick();
    }
    expect(tour()).toBeNull();
    expect(hasSeenTour("h1")).toBe(true);
    expect(wrapper.emitted("done")).toHaveLength(1);
    wrapper.unmount();
  });

  it("ends at once on Skip", async () => {
    const wrapper = mount(XpFirstRunTour, { props: { heroId: "h2" }, attachTo: document.body });
    jest.runOnlyPendingTimers();
    await wrapper.vm.$nextTick();
    await click("tour-skip");
    await wrapper.vm.$nextTick();
    expect(tour()).toBeNull();
    expect(hasSeenTour("h2")).toBe(true);
    wrapper.unmount();
  });

  it("stays away for a hero who already saw it", async () => {
    markTourSeen("h3");
    const wrapper = mount(XpFirstRunTour, { props: { heroId: "h3" }, attachTo: document.body });
    jest.runOnlyPendingTimers();
    await wrapper.vm.$nextTick();
    expect(tour()).toBeNull();
    wrapper.unmount();
  });
});
