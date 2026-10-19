import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { defaultMinutes, questMinutes } from "@/lib/services/quests/questClock";
import {
  CHORE_MINUTES,
  choreMinutes,
  minutesOnTaking,
  questMinutesWith,
} from "@/lib/services/quests/choreMinutes";

const bySlug = (slug: string) => {
  const entry = BEAST_LIBRARY.find((beast) => beast.slug === slug);
  if (!entry) throw new Error(`no library beast ${slug}`);
  return entry;
};

const walk = bySlug("zoomie-zephyr");
const bed = bySlug("bed-basilisk");

describe("how long a suggested chore takes", () => {
  it("only names beasts the library has", () => {
    for (const slug of Object.keys(CHORE_MINUTES)) expect(BEAST_LIBRARY.some((beast) => beast.slug === slug)).toBe(true);
  });

  it("gives a walk more than the 3 minutes a Tiny quest gets", () => {
    expect(defaultMinutes(1)).toBe(3);
    expect(choreMinutes(walk, 1)).toBeGreaterThan(3);
  });

  it("says nothing for a chore the table does not time, so the quest keeps following its size", () => {
    expect(choreMinutes(bed, 1)).toBeNull();
    expect(choreMinutes(null, 1)).toBeNull();
    expect(choreMinutes(undefined, 1)).toBeNull();
  });

  it("says nothing for a classic beast, which has no chore", () => {
    expect(choreMinutes(CLASSIC_BEASTS[0], 1)).toBeNull();
  });

  it("never gives a chore less than its size's own minutes", () => {
    expect(choreMinutes(walk, 1)).toBe(20);
    expect(choreMinutes(walk, 5)).toBe(20); // a Big quest follows the size's 12
    expect(choreMinutes(walk, 8)).toBeNull(); // a Boss quest's own 20 is already as long
    expect(choreMinutes(walk, 13)).toBeNull();
  });

  it("every timed chore takes longer than a Tiny quest and no more than a day", () => {
    for (const minutes of Object.values(CHORE_MINUTES)) {
      expect(minutes).toBeGreaterThan(defaultMinutes(1));
      expect(minutes).toBeLessThanOrEqual(24 * 60);
    }
  });
});

describe("the minutes a quest follows while the parent has typed none", () => {
  it("follows its suggested chore, else its size", () => {
    expect(questMinutesWith({ difficulty: 1 }, walk)).toBe(choreMinutes(walk, 1));
    expect(questMinutesWith({ difficulty: 1 }, bed)).toBe(3);
    expect(questMinutesWith({ difficulty: 2 }, null)).toBe(5);
  });

  it("keeps what the parent typed", () => {
    expect(questMinutesWith({ difficulty: 1, estimatedMinutes: 7 }, walk)).toBe(7);
  });

  it("reads like questMinutes when there is no suggestion", () => {
    for (const difficulty of [1, 2, 3, 5, 8, 13]) {
      expect(questMinutesWith({ difficulty }, null)).toBe(questMinutes({ difficulty }));
    }
  });
});

describe("the minutes a quest takes on with its beast", () => {
  it("stores the chore's time so the strike clock matches what the form showed", () => {
    expect(minutesOnTaking({ difficulty: 1 }, walk)).toBe(choreMinutes(walk, 1));
  });

  it("stores nothing when the parent typed minutes, the chore is untimed or the size is already longer", () => {
    expect(minutesOnTaking({ difficulty: 1, estimatedMinutes: 7 }, walk)).toBeNull();
    expect(minutesOnTaking({ difficulty: 1 }, bed)).toBeNull();
    expect(minutesOnTaking({ difficulty: 13 }, walk)).toBeNull();
  });
});
