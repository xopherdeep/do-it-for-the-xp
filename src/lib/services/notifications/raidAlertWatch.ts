/**
 * Books and rings the raid alerts (raidAlerts.ts) on this device. It runs on every app wake (start, sign in, back to the
 * front) and when Settings > Alerts turns the alerts on. The packaged app books each alert ahead for the start of the
 * raid's last day; a browser cannot wake itself, so it rings the alert on the first wake inside that last day instead.
 * A raid that falls, flees or loses this device's heroes has its alert taken back. Nothing here throws.
 */
import debug from "@/lib/utils/debug";
import { libraryEntryOf } from "@/lib/services/temples/templeQuestRows";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import { alertPermission, cancelAlert, scheduleAlert, showAlert } from "./alertBridge";
import { liveRaidsFor, raidAlertIdOf, raidAlertPlan, raidAlertsChoice } from "./raidAlerts";

/** The raids whose alert is booked on the device, so a raid that is over can have its alert taken back */
const BOOKED_KEY = "xp.raidAlertsBooked";
/** The raids whose alert was booked or rung, so the last day rings once */
const TOLD_KEY = "xp.raidAlertsTold";
const TOLD_KEEP = 50;

export interface RaidAlertRun {
  booked: number;
  rung: number;
  reason?: "off" | "not-allowed" | "failed";
}

const readList = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    debug.warn(`[raidAlertWatch] could not read ${key}`, error);
    return [];
  }
};

const writeList = (key: string, list: readonly string[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    // blocked storage: an alert may ring twice, which beats never ringing
    debug.warn(`[raidAlertWatch] could not keep ${key}`, error);
  }
};

const beastNameOf = (beastId: string): string => libraryEntryOf(beastId)?.name ?? "The raid beast";

/** Take back every booked raid alert (the alerts were turned off) */
export const cancelRaidAlerts = async (): Promise<void> => {
  for (const raidId of readList(BOOKED_KEY)) await cancelAlert(raidAlertIdOf(raidId));
  writeList(BOOKED_KEY, []);
};

/** One pass: book what is ahead, ring a last day nobody heard of, take back what is over */
export const runRaidAlerts = async (now: Date = new Date()): Promise<RaidAlertRun> => {
  try {
    const isOff = raidAlertsChoice() === "off";
    if (isOff) {
      await cancelRaidAlerts();
      return { booked: 0, rung: 0, reason: "off" };
    }
    // Never asks from here: the hero says yes in Settings > Alerts, or to the battle alerts question
    const isAllowed = (await alertPermission()) === "granted";
    if (!isAllowed) return { booked: 0, rung: 0, reason: "not-allowed" };

    const party = usePartyStore();
    await party.load();
    const raids = party.raids;
    const heroIds = Object.keys(useUserStore().users);
    const told = new Set(readList(TOLD_KEY));

    const live = new Set(liveRaidsFor(raids, heroIds, now).map(({ raid }) => raid.id));
    const booked = new Set<string>();
    for (const raidId of readList(BOOKED_KEY)) {
      const isOver = !live.has(raidId);
      if (isOver) await cancelAlert(raidAlertIdOf(raidId));
      else booked.add(raidId);
    }

    let bookedNow = 0;
    let rung = 0;
    for (const alert of raidAlertPlan({ raids, heroIds, now, told, beastNameOf })) {
      const { raidId, alertId, at, title, body, link } = alert;
      const base = { id: alertId, channelId: "battle-alerts" as const, title, body, link };
      if (at) {
        // In a browser this answers "web": nothing is booked, and the wake inside the last day rings it
        const result = await scheduleAlert({ ...base, at });
        if (result.shown) {
          booked.add(raidId);
          told.add(raidId);
          bookedNow++;
        }
        continue;
      }
      const result = await showAlert(base);
      if (result.shown) {
        told.add(raidId);
        rung++;
      }
    }

    writeList(BOOKED_KEY, [...booked]);
    writeList(TOLD_KEY, [...told].slice(-TOLD_KEEP));
    return { booked: bookedNow, rung };
  } catch (error) {
    debug.warn("[raidAlertWatch] a run failed", error);
    return { booked: 0, rung: 0, reason: "failed" };
  }
};
