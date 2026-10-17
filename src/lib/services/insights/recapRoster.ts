/**
 * Who is in the recap and what the profiles and feeds hand it. Pure: plain objects in, plain objects out.
 */
import type { XpNotification } from "@/lib/services/notifications/Notifications";
import type { RecapHeroRef, RecapLevelUp } from "./weeklyRecap";

interface ProfileLike {
  id?: unknown;
  isAdult?: unknown;
  name?: { nick?: string; first?: string } | null;
}

/** The name a profile goes by: nickname, else first name */
export const heroNameOf = (profile: ProfileLike | null | undefined): string =>
  String(profile?.name?.nick || profile?.name?.first || "Hero");

/** The heroes of the family: every profile that is not a Game Master (isAdult), sorted by name */
export const recapHeroesOf = (users: Record<string, ProfileLike | undefined>): RecapHeroRef[] =>
  Object.entries(users)
    .filter(([, profile]) => Boolean(profile) && profile!.isAdult !== true)
    .map(([key, profile]) => ({ id: String(profile!.id ?? key), name: heroNameOf(profile) }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** The levels a hero reached, read from the level-up notes in their feed (refId "level-7") */
export const levelUpsOf = (feed: readonly XpNotification[], heroId: string): RecapLevelUp[] => {
  const ups: RecapLevelUp[] = [];
  for (const note of feed) {
    const isLevelUp = note.kind === "level-up" && String(note.heroId) === String(heroId);
    const level = Number(String(note.refId || "").replace(/^level-/, ""));
    const isLevelKnown = Number.isFinite(level) && level > 0;
    const isCounted = isLevelUp && isLevelKnown;
    if (isCounted) ups.push({ heroId: String(heroId), level, at: note.createdAt });
  }
  return ups;
};
