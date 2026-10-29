/**
 * How a party with other families reads on the Roster, Activity and Synergies tabs: the site's answer in, the rows those
 * tabs already know how to draw out. Pure: no network, no stores.
 */
import { libraryEntryOf } from "@/lib/services/temples/templeQuestRows";
import { presetText } from "./presets";
import type { PartyActivityItem, PartyMember } from "./partyStats";
import { memberKey, type WireEvent, type WireParty } from "./partyWire";

export { memberKey };

/** The members as rows for the Roster tab, the leader marked */
export const rosterOf = (party: WireParty): PartyMember[] =>
  party.members.map((member) => ({
    id: memberKey(member.familyId, member.heroId),
    name: { nick: member.card.nickname },
    jobClass: member.card.jobClass,
    role: member.role,
    stats: { level: member.card.level },
  }));

/**
 * Which of our heroes speaks in a party: the one asked for when it is ours and in the party, else the first of ours in
 * it, else "" (the family's id says which hero is ours: hero ids are only unique inside a family).
 */
export const ownHeroIn = (party: WireParty, familyId: string, preferredHeroId: string): string => {
  const ours = party.members.filter((member) => member.familyId === familyId);
  const preferred = ours.find((member) => member.heroId === preferredHeroId);
  const chosen = preferred ?? ours[0];
  return chosen ? chosen.heroId : "";
};

/** The heroes who struck the party's raid on this calendar day (the strikers' own day), each once */
export const heroIdsToday = (party: WireParty, dayKey: string): string[] => {
  const strikes = party.raid ? party.raid.strikes : [];
  const today = strikes.filter((strike) => strike.day === dayKey);
  return [...new Set(today.map((strike) => memberKey(strike.familyId, strike.heroId)))];
};

type Wording = (who: string, event: WireEvent, nameOf: (familyId: unknown, heroId: unknown) => string | null) => string;

const textOf = (value: unknown): string => {
  const isText = typeof value === "string";
  return isText ? value : "";
};

const beastNameOf = (beastId: unknown): string => {
  const entry = libraryEntryOf(textOf(beastId));
  return entry ? entry.name : "a great beast";
};

/** A word aimed at someone reads as an action ("Ana cheers on Ben"); any other reads as a line of speech */
const AIMED: Record<string, string> = { cheer: "cheers on", poke: "pokes" };

const presetLine: Wording = (who, event, nameOf) => {
  const preset = textOf(event.data.preset);
  const target = nameOf(event.data.toFamily, event.data.toHero);
  const verb = AIMED[preset];
  const isAimed = Boolean(verb) && target !== null;
  return isAimed ? `${who} ${verb} ${target}` : `${who}: ${presetText(preset) ?? ""}`;
};

/** What each kind of event says; a kind not here is not worth a line */
const WORDING: Record<string, Wording> = {
  join: (who) => `${who} joined the party`,
  leave: (who) => `${who} left the party`,
  raid: (_who, event) => `A raid began on ${beastNameOf(event.data.beastId)}`,
  strike: (who, event) => `${who} struck for ${Number(event.data.damage) || 0}`,
  defeat: (who) => `The beast was defeated! ${who} landed the last hit.`,
  preset: presetLine,
};

/** The party's events as lines for the Activity tab, newest first */
export const activityOf = (events: WireEvent[], party: WireParty): PartyActivityItem[] => {
  const byKey = new Map(party.members.map((member) => [memberKey(member.familyId, member.heroId), member.card.nickname]));
  const nameOf = (familyId: unknown, heroId: unknown): string | null => {
    const hasBoth = typeof familyId === "string" && typeof heroId === "string";
    return hasBoth ? byKey.get(memberKey(familyId, heroId)) ?? null : null;
  };

  const lines: PartyActivityItem[] = [];
  for (const event of [...events].sort((a, b) => b.seq - a.seq)) {
    const wording = WORDING[event.kind];
    if (!wording) continue;
    const who = nameOf(event.familyId, event.heroId) ?? "A hero";
    const hasHero = event.familyId !== null && event.heroId !== null;
    lines.push({
      id: `${party.id}:${event.seq}`,
      text: wording(who, event, nameOf),
      userId: hasHero ? memberKey(String(event.familyId), String(event.heroId)) : "",
      nickname: who,
      questName: "",
      xp: 0,
      completedAt: event.at,
    });
  }
  return lines;
};
