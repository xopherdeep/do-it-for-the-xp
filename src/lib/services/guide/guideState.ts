/**
 * What the Guide remembers for a hero, kept on the profile as `guide` so it rides along in backups and follows the
 * hero to another device: whether the intro was said, the Beast Log and a shop seen, the tracker hidden, and when the
 * Sky Champion celebration happened. Also the celebration's one-time reward.
 */
import { useUserStore } from "@/lib/store/stores/user";
import { CHAMPION_REWARD, CHAMPION_TITLE } from "./nextStep";

export interface GuideRecord {
  introSeen?: boolean;
  questsSeen?: boolean;
  shopSeen?: boolean;
  /** The hero tucked the tracker away; the avatar menu's Guide brings it back */
  hidden?: boolean;
  /** ISO time of the Sky Champion celebration (the reward is paid once, when this is first set) */
  championAt?: string;
}

/** The hero's Guide record; an older profile has none. */
export const guideRecordOf = (user: { guide?: unknown } | null | undefined): GuideRecord => {
  const record = user?.guide;
  return record && typeof record === "object" ? (record as GuideRecord) : {};
};

export const markGuide = (heroId: string, patch: GuideRecord): void => {
  if (!heroId) return;
  const store = useUserStore();
  const record = guideRecordOf(store.getUserById(heroId));
  const isNew = Object.entries(patch).some(([key, value]) => record[key as keyof GuideRecord] !== value);
  if (isNew) store.setGuide(heroId, patch as Record<string, unknown>);
};

/** Which route marks what as seen: the Beast Log and any shop (Home Town's or a region's). */
const SEEN_BY_ROUTE: Readonly<Record<string, keyof GuideRecord>> = {
  "my-tasks": "questsSeen",
  shop: "shopSeen",
};

/** Note that the hero reached a route the Guide is waiting on (the router's afterEach calls this). */
export const markRouteSeen = (routeName: unknown, heroId: string | undefined): void => {
  const field = typeof routeName === "string" ? SEEN_BY_ROUTE[routeName] : undefined;
  if (!field || !heroId) return;
  if (guideRecordOf(useUserStore().getUserById(heroId))[field]) return;
  markGuide(heroId, { [field]: true });
};

export interface ChampionPaid {
  xp: number;
  gp: number;
  ap: number;
  levelUp: { from: number; to: number } | null;
}

/**
 * Crown the hero a Sky Champion and pay the reward, once. A hero already crowned is paid nothing and answers null.
 */
export const crownChampion = (heroId: string, now: Date = new Date()): ChampionPaid | null => {
  const store = useUserStore();
  const user = store.getUserById(heroId);
  if (!user || guideRecordOf(user).championAt) return null;
  store.setGuide(heroId, { championAt: now.toISOString() });

  const { xp, gp, ap } = CHAMPION_REWARD;
  const levelUp = store.updateUserXP({ userId: heroId, amount: xp, commit: true });
  store.updateClassXp(heroId, user.jobClass || "default", xp);
  void store.updateUserGP({ userId: heroId, wallet: gp, kind: "earn", note: CHAMPION_TITLE });
  store.recordAPGain({ userId: heroId, amount: ap, source: "guide:champion" });
  const hasLevelUp = Boolean(levelUp?.didLevelUp);
  return {
    xp,
    gp,
    ap,
    levelUp: hasLevelUp ? { from: Number(levelUp.oldLevel), to: Number(levelUp.newLevel) } : null,
  };
};
