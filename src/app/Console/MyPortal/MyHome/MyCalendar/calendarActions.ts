import type { RouteLocationRaw } from "vue-router";
import { DRAW_BEAST_ACTION } from "../../UserHud/MyQuests/questLogActions";

/**
 * What the Calendar's FAB offers in its action sheet. Pure: no router, no Ionic.
 *
 * Every entry is wired to something real, for every player: "New Quest" opens the Quest Wizard on the day and part of
 * the day on screen (a hero's quest waits for the Game Master's approval, see questWizard.ts), anyone can jump back to
 * today or open the quest log. A maker (familySettings.canMake) also gets "Draw a Beast", the Beast Maker, last.
 */
export type CalendarActionId = "new-quest" | "today" | "quest-log" | "draw-beast";

export interface CalendarAction {
  id: CalendarActionId;
  text: string;
  /** Font Awesome duotone icon name, no prefix */
  icon: string;
}

export interface CalendarActionContext {
  /** The day on screen is today */
  isToday: boolean;
  /** The hero on screen may make beasts */
  isMaker?: boolean;
}

export function calendarActions({ isToday, isMaker = false }: CalendarActionContext): CalendarAction[] {
  const actions: CalendarAction[] = [{ id: "new-quest", text: "New Quest", icon: "scroll" }];
  if (!isToday) actions.push({ id: "today", text: "Jump to Today", icon: "calendar-day" });
  actions.push({ id: "quest-log", text: "Open the Beast Log", icon: "dragon" });
  if (isMaker) actions.push(DRAW_BEAST_ACTION);
  return actions;
}

/** The hero's own quest log. */
export function questLogRoute(heroId: string): RouteLocationRaw {
  return { name: "my-tasks", params: { userId: heroId } };
}
