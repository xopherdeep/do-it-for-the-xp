/**
 * What a project tower says while it is played: the floor clock and the bonus offer in the temple's header, the "Floor
 * cleared!" fanfare, and the Hometown tower sheet with the Game Master's two controls (floorClock.ts, towerPrompts.ts,
 * ProjectTowerSheet.vue). Tower, phase and floor names ("The Spring Spire", "Deep Clean", "2F") and the sheet's button
 * names stay the same in every voice. {days} and {multiplier} arrive as digits ({multiplier} with one decimal), {day} as
 * the weekday ("Sat") or, past a week, the date ("Apr 10").
 */
import type { CopyCatalog } from "../voices";

export const projectTower = {
  // The clock under the room's name: how long the floor has
  "projectTower.clock.daysLeft": {
    simple: "{phase}: due {day}, {days} days left",
    adventure: "{phase}: due {day}, {days} days to go",
    classic: "{phase}: due {day}, {days} days left",
  },
  "projectTower.clock.dayLeft": {
    simple: "{phase}: due {day}, 1 day left",
    adventure: "{phase}: due {day}, 1 day to go",
    classic: "{phase}: due {day}, 1 day left",
  },
  "projectTower.clock.today": {
    simple: "{phase}: due today",
    adventure: "{phase}: due today!",
    classic: "{phase}: due today",
  },
  "projectTower.clock.late": {
    simple: "{phase}: late",
    adventure: "{phase}: running late",
    classic: "{phase}: overdue",
  },
  "projectTower.clock.cleared": {
    simple: "{phase}: cleared",
    adventure: "{phase}: cleared!",
    classic: "{phase}: cleared",
  },
  // The early-finish offer, while the multiplier is above x1
  "projectTower.clock.offer": {
    simple: "Clear this floor today for ×{multiplier}",
    adventure: "Clear this floor today for ×{multiplier} rewards!",
    classic: "Clear this floor today for ×{multiplier}",
  },

  // The fanfare when a floor is cleared
  "projectTower.floorCleared.title": { adventure: "Floor cleared!" },
  "projectTower.floorCleared.name": {
    simple: "{phase} is done!",
    adventure: "{phase} is conquered!",
    classic: "{phase} is clear.",
  },
  "projectTower.floorCleared.bonus": {
    simple: "Early bonus: ×{multiplier}",
    adventure: "Early finish bonus: ×{multiplier} rewards!",
    classic: "Early bonus ×{multiplier}",
  },

  // The Game Master's last question before a project is given up
  "projectTower.abandon.ask": {
    simple: "Give up {tower}? The open chores will vanish.",
    adventure: "Abandon {tower}? Its tower and its open chores will vanish. Finished chores stay.",
    classic: "Abandon {tower}? The tower and its open chores are removed. Finished chores stay.",
  },

  // The Hometown tower sheet
  "projectTower.sheet.title": { adventure: "The tower" },
  "projectTower.sheet.current": { adventure: "Current floor" },
  "projectTower.sheet.floors": { adventure: "Floors" },
  "projectTower.sheet.endsOn": { adventure: "Ends {date}" },
  "projectTower.state.cleared": { adventure: "Cleared" },
  "projectTower.state.open": { adventure: "Open" },
  "projectTower.state.asleep": { adventure: "Asleep" },
  "projectTower.sheet.enter": { adventure: "Enter the tower" },
  "projectTower.sheet.moveEnd": { adventure: "Move the end date" },
  "projectTower.sheet.abandon": { adventure: "Abandon project" },
  "projectTower.sheet.endLabel": { adventure: "New last day" },
  "projectTower.sheet.endMove": { adventure: "Move it" },
  "projectTower.sheet.endPast": {
    simple: "That day has passed.",
    adventure: "That day is already behind us.",
    classic: "The end date cannot be in the past.",
  },
  "projectTower.sheet.endInvalid": {
    simple: "Pick a real day.",
    adventure: "Pick a real day on the calendar.",
    classic: "Enter a valid date.",
  },
  "projectTower.sheet.endRefused": {
    simple: "That is too soon for the floors left.",
    adventure: "Too soon: the floors left need more days.",
    classic: "Too soon for the floors left.",
  },
  "projectTower.sheet.endMoved": {
    simple: "New last day: {date}",
    adventure: "The tower now closes on {date}.",
    classic: "End date moved to {date}.",
  },
  "projectTower.sheet.abandoned": {
    simple: "{tower} is gone.",
    adventure: "{tower} crumbles. The project is abandoned.",
    classic: "Project abandoned.",
  },
  "projectTower.sheet.abandonFailed": {
    simple: "That did not work. Try again.",
    adventure: "The tower would not fall. Try again.",
    classic: "The project could not be abandoned.",
  },
  "projectTower.sheet.empty": {
    simple: "No tower stands in town.",
    adventure: "No tower stands in the plaza right now.",
    classic: "No project is running.",
  },

  // The tower's spot on the plaza: the cue under its name
  "projectTower.spot.cue": { adventure: "Now on {floor}: {phase}" },
} satisfies CopyCatalog;
