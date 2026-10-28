/**
 * What a change of rooms does to the chores the Game Master has in the wizard's list (projectWizard.withHouse): the
 * suggestions are made again for the new rooms, but a chore carried from the board (Moving Out from the Moving House
 * dialog) and a chore the Game Master added stay, and a floor that holds carried chores is not suggested again.
 */
import { buildMovingPack } from "@/lib/services/core/packs/movingPack";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import { MOVING_OUT } from "@/lib/services/core/packs/projects/movingOut";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import { carriedQuestIds, prefillMovingOut } from "@/lib/services/projects/movingOutPrefill";
import { WHOLE_HOUSE_ID, choresFromLastRun, suggestChores } from "@/lib/services/projects/projectChores";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import { addChore, newProjectDraft, withHouse, withType } from "@/lib/services/projects/projectWizard";
import { SIX, TWELVE, PARENT, answers } from "./movingHouseFixtures";

const TODAY = "2026-10-01";
const HEROES: PackHero[] = [PARENT, TWELVE, SIX];
const GIVEN = answers({ today: TODAY });
const QUESTS = buildMovingPack(GIVEN).quests;
const OUT_PHASES = MOVING_OUT.phases.map((phase) => phase.id);
const phaseOf = (quest: { categoryId: string }): string => quest.categoryId.replace("cat-move-", "");
const TOWER_QUESTS = QUESTS.filter((quest) => OUT_PHASES.includes(phaseOf(quest)));
const SMALLER = { rooms: { kitchen: 1 } };

const context = (lastChores: readonly ProjectChore[] | null = null) => ({ today: TODAY, heroes: HEROES, lastChores });
const sorted = (ids: string[]): string[] => [...ids].sort();

describe("changing the rooms of a draft with chores carried from the board", () => {
  it("keeps every carried chore, and suggests nothing again on a floor that holds them", () => {
    const draft = prefillMovingOut(GIVEN, TOWER_QUESTS, HEROES);

    const after = withHouse(draft, SMALLER, context());

    expect(sorted(carriedQuestIds(after))).toEqual(sorted(carriedQuestIds(draft)));
    expect(carriedQuestIds(after).length).toBeGreaterThan(10);
    const floorsHoldingThem = new Set(after.chores.filter((chore) => chore.custom).map((chore) => chore.phaseId));
    for (const chore of after.chores) {
      if (floorsHoldingThem.has(chore.phaseId)) expect(chore.custom).toBe(true);
    }
  });

  it("suggests again, for the new rooms, the floors that hold no carried chore, and keeps the finale", () => {
    const declutter = TOWER_QUESTS.filter((quest) => phaseOf(quest) === "declutter");
    const draft = prefillMovingOut(GIVEN, declutter, HEROES);

    const after = withHouse(draft, SMALLER, context());

    const suggested = suggestChores(MOVING_OUT, SMALLER, HEROES);
    for (const phase of ["quiet", "living", "last", "roof"]) {
      expect(after.chores.filter((chore) => chore.phaseId === phase)).toEqual(suggested.filter((chore) => chore.phaseId === phase));
    }
    expect(sorted(carriedQuestIds(after))).toEqual(sorted(declutter.map((quest) => String(quest.id))));
  });

  it("keeps the floors in order, the finale last", () => {
    const draft = prefillMovingOut(GIVEN, TOWER_QUESTS, HEROES);

    const after = withHouse(draft, SMALLER, context());

    const order = [...OUT_PHASES, "roof"];
    const ranks = after.chores.map((chore) => order.indexOf(chore.phaseId));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(after.chores.filter((chore) => chore.phaseId === "roof")).toHaveLength(1);
  });
});

describe("changing the rooms of a draft with the Game Master's own chores", () => {
  const SPRING = PROJECT_TYPES["spring-cleaning"];
  const picked = () => withType(newProjectDraft(TODAY), "spring-cleaning", context());

  it("keeps a chore they added, last on its floor, while the floor's suggestions are made for the new rooms", () => {
    const added = addChore(picked(), "declutter", "Wash the dog", HEROES);

    const after = withHouse(added, SMALLER, context());

    const onFloor = after.chores.filter((chore) => chore.phaseId === "declutter");
    expect(onFloor[onFloor.length - 1]).toMatchObject({ name: "Wash the dog", custom: true });
    expect(onFloor.filter((chore) => !chore.custom)).toEqual(suggestChores(SPRING, SMALLER, HEROES).filter((chore) => chore.phaseId === "declutter"));
  });

  it("does not double the own chores of a re-run, which the last run's list brings back itself", () => {
    const last = addChore(picked(), "declutter", "Wash the dog", HEROES).chores;
    const draft = withType(newProjectDraft(TODAY), "spring-cleaning", context(last));
    expect(draft.chores.filter((chore) => chore.name === "Wash the dog")).toHaveLength(1);

    const after = withHouse(draft, SMALLER, context(last));

    expect(after.chores.filter((chore) => chore.name === "Wash the dog")).toHaveLength(1);
    // none is dropped and none is added: the list is the last run's, moved into the rooms the house has
    expect(after.chores).toHaveLength(choresFromLastRun(last, HEROES).length);
  });

  it("brings a kept chore whose room is gone into the Whole House", () => {
    const added = addChore(picked(), "declutter", "Clear the third bedroom", HEROES);
    const inRoom = { ...added, chores: added.chores.map((chore) => (chore.custom ? { ...chore, roomId: "bedroom-3" } : chore)) };

    const after = withHouse(inRoom, SMALLER, context());

    expect(after.chores.find((chore) => chore.custom)?.roomId).toBe(WHOLE_HOUSE_ID);
  });
});
