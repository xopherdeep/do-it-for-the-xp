import type { Raid } from "@/lib/services/party/raidRules";
import { alertPermission, cancelAlert, scheduleAlert, showAlert } from "@/lib/services/notifications/alertBridge";
import { raidAlertIdOf, setRaidAlertsChoice } from "@/lib/services/notifications/raidAlerts";
import { runRaidAlerts } from "@/lib/services/notifications/raidAlertWatch";

/** The raid alerts runner: books ahead on the phone, rings the last day in a browser, takes back what is over */

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
  memberIds: ["ana"],
  strikes: [],
  ...over,
});

let mockRaids: Raid[] = [];
jest.mock("@/lib/store/stores/party", () => ({
  usePartyStore: () => ({ load: async () => undefined, raids: mockRaids }),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ users: { ana: {} } }),
}));
jest.mock("@/lib/services/temples/templeQuestRows", () => ({
  libraryEntryOf: () => ({ name: "Socktopus" }),
}));
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  alertPermission: jest.fn(async () => "granted"),
  cancelAlert: jest.fn(async () => undefined),
  scheduleAlert: jest.fn(async () => ({ shown: true })),
  showAlert: jest.fn(async () => ({ shown: true })),
}));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { warn: jest.fn(), log: jest.fn(), error: jest.fn() } }));

const booked = scheduleAlert as jest.Mock;
const rung = showAlert as jest.Mock;
const cancelled = cancelAlert as jest.Mock;
const permission = alertPermission as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockRaids = [makeRaid()];
});

describe("runRaidAlerts", () => {
  it("books the alert ahead on the phone, then stays quiet on the last day", async () => {
    expect(await runRaidAlerts(at(1))).toEqual({ booked: 1, rung: 0 });
    expect(booked.mock.calls[0][0]).toMatchObject({ id: raidAlertIdOf("raid-1"), at: at(6), title: "Socktopus is about to flee!" });
    expect(await runRaidAlerts(at(6.5))).toEqual({ booked: 0, rung: 0 });
    expect(rung).not.toHaveBeenCalled();
  });

  it("in a browser books nothing ahead and rings once on the first wake of the last day", async () => {
    booked.mockResolvedValue({ shown: false, reason: "web" });
    expect(await runRaidAlerts(at(1))).toEqual({ booked: 0, rung: 0 });
    expect(await runRaidAlerts(at(6.5))).toEqual({ booked: 0, rung: 1 });
    expect(await runRaidAlerts(at(6.6))).toEqual({ booked: 0, rung: 0 });
    booked.mockResolvedValue({ shown: true });
  });

  it("takes back the alert of a raid that fell", async () => {
    await runRaidAlerts(at(1));
    mockRaids = [makeRaid({ strikes: [{ key: "k", heroId: "ana", damage: 100, at: at(2).toISOString() }] })];
    await runRaidAlerts(at(2));
    expect(cancelled).toHaveBeenCalledWith(raidAlertIdOf("raid-1"));
  });

  it("takes back every booked alert when turned off, and never asks for permission itself", async () => {
    await runRaidAlerts(at(1));
    setRaidAlertsChoice("off");
    expect(await runRaidAlerts(at(2))).toMatchObject({ reason: "off" });
    expect(cancelled).toHaveBeenCalledWith(raidAlertIdOf("raid-1"));

    setRaidAlertsChoice("on");
    permission.mockResolvedValueOnce("prompt");
    expect(await runRaidAlerts(at(2))).toMatchObject({ reason: "not-allowed" });
  });
});
