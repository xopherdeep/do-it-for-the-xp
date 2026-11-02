import type { Raid } from "@/lib/services/party/raidRules";
import {
  RAID_ALERT_LEAD_MS,
  liveRaidsFor,
  raidAlertIdOf,
  raidAlertPlan,
  raidAlertsChoice,
  raidAlertTimeOf,
  setRaidAlertsChoice,
} from "@/lib/services/notifications/raidAlerts";

/** Raid alerts: one heads-up per raid, a day before the beast flees, for the raids this device's heroes are in */

const DAY = 24 * 60 * 60 * 1000;
const START = new Date(2026, 9, 28, 8, 0, 0);
const at = (days: number): Date => new Date(START.getTime() + days * DAY);

const makeRaid = (over: Partial<Raid> = {}): Raid => ({
  id: "raid-1",
  partyId: "home",
  beastId: "socktopus",
  window: "standard",
  startedAt: START.toISOString(),
  maxHp: 100,
  memberIds: ["ana", "ben"],
  strikes: [],
  ...over,
});

const plan = (raids: Raid[], now: Date, told: string[] = [], heroIds = ["ana"]) =>
  raidAlertPlan({ raids, heroIds, now, told: new Set(told), beastNameOf: () => "Socktopus" });

describe("raidAlertPlan", () => {
  it("books a standing raid's alert for one day before its window closes", () => {
    const [alert] = plan([makeRaid()], at(1));
    expect(alert.at).toEqual(at(6));
    expect(alert.at!.getTime()).toBe(at(7).getTime() - RAID_ALERT_LEAD_MS);
    expect(alert.alertId).toBe(raidAlertIdOf("raid-1"));
    expect(alert.title).toBe("Socktopus is about to flee!");
    expect(alert.body).toContain("100 HP");
    expect(alert.link).toBe("/my-portal/ana/my-party");
  });

  it("rings now, once, for a raid already in its last day", () => {
    expect(plan([makeRaid()], at(6.5))[0].at).toBeNull();
    expect(plan([makeRaid()], at(6.5), ["raid-1"])).toEqual([]);
  });

  it("keeps booking a raid told ahead, so its alert carries the latest health", () => {
    expect(plan([makeRaid()], at(2), ["raid-1"])).toHaveLength(1);
  });

  it("leaves out a raid with no hero of this device, a felled beast and one that fled", () => {
    const felled = makeRaid({ id: "felled", strikes: [{ key: "k", heroId: "ana", damage: 100, at: at(1).toISOString() }] });
    expect(plan([makeRaid()], at(1), [], ["zed"])).toEqual([]);
    expect(plan([felled], at(2))).toEqual([]);
    expect(plan([makeRaid()], at(8))).toEqual([]);
  });

  it("tells a shared device once per raid, linking the first of its heroes in the raid", () => {
    const alerts = plan([makeRaid()], at(1), [], ["ben", "ana"]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].link).toBe("/my-portal/ana/my-party");
  });
});

describe("liveRaidsFor and the alert time", () => {
  it("lists only standing raids of this device's heroes", () => {
    const other = makeRaid({ id: "other", memberIds: ["zed"] });
    expect(liveRaidsFor([makeRaid(), other], ["ben"], at(1)).map(({ raid, hero }) => [raid.id, hero])).toEqual([["raid-1", "ben"]]);
  });

  it("follows the window's length", () => {
    expect(raidAlertTimeOf(makeRaid({ window: "quick" }))).toEqual(at(2));
    expect(raidAlertTimeOf(makeRaid({ window: "epic" }))).toEqual(at(13));
  });

  it("gives each raid its own stable id, clear of the fixed alert ids", () => {
    expect(raidAlertIdOf("raid-1")).toBe(raidAlertIdOf("raid-1"));
    expect(raidAlertIdOf("raid-1")).not.toBe(raidAlertIdOf("raid-2"));
    expect(raidAlertIdOf("raid-1")).toBeGreaterThanOrEqual(7_100_000);
  });
});

describe("the raid alerts choice", () => {
  beforeEach(() => localStorage.clear());

  it("is on until someone turns it off", () => {
    expect(raidAlertsChoice()).toBe("on");
    setRaidAlertsChoice("off");
    expect(raidAlertsChoice()).toBe("off");
    setRaidAlertsChoice("on");
    expect(raidAlertsChoice()).toBe("on");
  });
});
