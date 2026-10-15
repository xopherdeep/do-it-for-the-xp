/**
 * The Hospital's patient chart: what the nurse reads off one hero's HP and MP on the Patients board.
 * Pure, so the screen only draws it: the status word, the bar's colour band and the heart monitor's pace.
 */
import { readPool, type CareStats } from "./Lodging";

/** Healthy, hurt, critical, or knocked out (0 HP: a fight lost, the hero is carried in and treated). */
export type PatientStatus = "healthy" | "hurt" | "critical" | "down";

/** At or above this share of max HP the hero reads as healthy (green). */
export const HEALTHY_SHARE = 0.75;
/** At or below this share (and above 0) the hero is critical (red). */
export const CRITICAL_SHARE = 0.25;

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  healthy: "Healthy",
  hurt: "Hurt",
  critical: "Critical",
  down: "Knocked Out",
};

/** One heartbeat on the monitor, in seconds: calm when healthy, racing when critical, none when down. */
const BEAT_SECONDS: Record<PatientStatus, number> = {
  healthy: 2.4,
  hurt: 1.6,
  critical: 0.9,
  down: 0,
};

export interface PatientChart {
  hp: { now: number; max: number };
  mp: { now: number; max: number };
  /** HP as a share of max, 0..1 */
  hpShare: number;
  mpShare: number;
  status: PatientStatus;
  label: string;
  /** Seconds per beat on the heart monitor; 0 is a flat line */
  beatSeconds: number;
  /** HP or MP below max: there is something for Nurse Joy to treat */
  needsCare: boolean;
}

const shareOf = (pool: { now: number; max: number }): number =>
  pool.max > 0 ? Math.max(0, Math.min(1, pool.now / pool.max)) : 0;

/** The status band for an HP share. */
export function patientStatusOf(hpShare: number): PatientStatus {
  const isDown = hpShare <= 0;
  if (isDown) return "down";
  const isCritical = hpShare <= CRITICAL_SHARE;
  if (isCritical) return "critical";
  const isHurt = hpShare < HEALTHY_SHARE;
  if (isHurt) return "hurt";
  return "healthy";
}

/** One hero's chart from their stats, read with the same defaults as the Hospital's prices (`readPool`). */
export function patientChartOf(stats: CareStats | null | undefined): PatientChart {
  const hp = readPool(stats?.hp, stats?.maxHp);
  const mp = readPool(stats?.mp, stats?.maxMp);
  const hpShare = shareOf(hp);
  const status = patientStatusOf(hpShare);
  return {
    hp,
    mp,
    hpShare,
    mpShare: shareOf(mp),
    status,
    label: PATIENT_STATUS_LABELS[status],
    beatSeconds: BEAT_SECONDS[status],
    needsCare: hp.now < hp.max || mp.now < mp.max,
  };
}
