/**
 * The words of the weekly recap: kind, varied lines and the plain text for the share sheet. Pure.
 *
 * Variety is deterministic: the phrasing is picked from the week's first day, so the same week always reads the same
 * (a screen that re-renders never reshuffles) while a new week sounds fresh. Nobody is ever named for doing less.
 */
import type { HeroRecap, WeeklyRecap } from "./weeklyRecap";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;

/** A small stable number from text */
const seedOf = (text: string): number => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 100003, 7);

const pick = <T>(options: readonly T[], seed: number, salt: number): T => options[(seed + salt * 7) % options.length];

/** "the Socktopus", but never "the the Socktopus" */
const withThe = (name: string): string => (/^the\s/i.test(name) ? name : `the ${name}`);

const heroLines = (hero: HeroRecap, seed: number): string[] => {
  const lines: string[] = [];
  const topBeast = hero.beasts[0];
  const hasFavoriteFoe = Boolean(topBeast) && topBeast.count > 1;
  if (hasFavoriteFoe) {
    lines.push(
      pick(
        [
          `${hero.name} tamed ${withThe(topBeast.name)} ${topBeast.count} times!`,
          `${withThe(topBeast.name)} met ${hero.name} ${topBeast.count} times this week and lost every time.`,
        ],
        seed,
        hero.name.length
      )
    );
  }
  const isOnStreak = hero.streak >= 2;
  if (isOnStreak) {
    lines.push(
      pick(
        [`${hero.name} is on a ${hero.streak}-day streak!`, `${hero.name} kept the fire burning for ${hero.streak} days in a row.`],
        seed,
        hero.name.length + 1
      )
    );
  }
  for (const level of hero.levelUps.slice(-1)) lines.push(`${hero.name} reached level ${level}!`);
  return lines;
};

/** The recap's headline lines, the most bragworthy first. */
export const recapLinesOf = (recap: WeeklyRecap): string[] => {
  const seed = seedOf(recap.from);
  const { family } = recap;
  if (recap.isEmpty) {
    const hasPending = family.pending > 0;
    return [
      hasPending
        ? `${plural(family.pending, "quest")} waiting for the Game Master's nod. Nicely done!`
        : pick(
            [
              "A quiet week in the village. A fresh week is a fresh start!",
              "The village rested this week. Ready for the next adventure?",
            ],
            seed,
            0
          ),
    ];
  }
  const lines: string[] = [];
  const isSolo = recap.heroes.filter((hero) => hero.chores > 0).length === 1 && recap.heroes.length === 1;
  const isCrowned = Boolean(recap.heroOfTheWeek) && !isSolo;
  const isTeamWin = recap.teamWin;
  if (isTeamWin) {
    lines.push(pick(["Everyone finished level: this week is a team win!", "No hero pulled ahead. What a team!"], seed, 1));
  } else if (isCrowned) {
    const hero = recap.heroOfTheWeek!;
    lines.push(`${hero.name} is hero of the week with ${plural(hero.chores, "chore")} done!`);
  }
  lines.push(
    pick(
      [
        `The village finished ${plural(family.chores, "chore")} and earned ${family.xp} XP together!`,
        `${plural(family.chores, "chore")} done and ${family.xp} XP earned. The village thanks you!`,
      ],
      seed,
      2
    )
  );
  for (const hero of recap.heroes) lines.push(...heroLines(hero, seed));
  const busiest = family.busiestDay;
  if (busiest) lines.push(`${WEEKDAYS[busiest.weekday]} was the busiest day, with ${plural(busiest.chores, "chore")}.`);
  const hasPending = family.pending > 0;
  if (hasPending) lines.push(`${plural(family.pending, "quest")} waiting for the Game Master's nod.`);
  return lines;
};

const dayLabel = (dayKey: string): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** The recap as plain text for the share sheet or the clipboard */
export const recapShareText = (recap: WeeklyRecap): string => {
  const head = `This week in the village (${dayLabel(recap.from)} to ${dayLabel(recap.to)})`;
  const tail = "Do It For The XP";
  if (recap.isEmpty) return [head, ...recap.lines.map((line) => `- ${line}`), tail].join("\n");
  const heroes = recap.heroes
    .filter((hero) => hero.chores > 0)
    .map((hero) => `${hero.name}: ${plural(hero.chores, "chore")}, ${hero.xp} XP, ${hero.gp} GP`);
  return [head, ...recap.lines.map((line) => `- ${line}`), ...heroes, tail].join("\n");
};
