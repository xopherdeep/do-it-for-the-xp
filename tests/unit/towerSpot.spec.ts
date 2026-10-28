/**
 * The tower's spot on the Hometown plaza: its name under it, where the family is on it, and the voxel scene that draws
 * it (a narrow stack of the project's floors in its element's colours). Pure: the record and the voice go in.
 */
import { copyFor } from "@/lib/services/copy/copy";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { standingProjectOf, towerSpotOf } from "@/app/Console/MyPortal/HomeTown/components/towerSpot";
import { getBuildingBoxes, projectTowerSceneId } from "@/components/organisms/BuildingModel/voxel/buildingShapes";

const WINDOW = { phaseId: "x", opensOn: "2027-04-01", dueOn: "2027-04-10" };

const floorOf = (floorKey: string, phaseId: string, extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey, phaseId, window: { ...WINDOW, phaseId }, questIds: [`pq-${floorKey}`], ...extra,
});

const projectOf = (typeId: ProjectRecord["typeId"], floors: ProjectFloor[]): ProjectRecord => ({
  id: `${typeId}-2027-04-01`,
  typeId,
  templeId: `gen-project-${typeId}`,
  status: "active",
  startOn: "2027-04-01",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors,
  chores: [],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
});

const SPRING_FLOORS = (): ProjectFloor[] => [
  floorOf("1F", "declutter", { wokenAt: "2027-04-01T09:00:00.000Z", clearedAt: "2027-04-02T09:00:00.000Z" }),
  floorOf("2F", "deep-clean", { wokenAt: "2027-04-02T09:00:00.000Z" }),
  floorOf("3F", "organize"),
  floorOf("4F", "final-inspection"),
  floorOf("5F", "roof"),
];

describe("towerSpotOf", () => {
  it("is named for the tower and cues the floor the family is on", () => {
    const spot = towerSpotOf(projectOf("spring-cleaning", SPRING_FLOORS()), "adventure");

    expect(spot.label).toBe("The Spring Spire");
    expect(spot.cue).toBe("Now on 2F: Deep Clean");
  });

  it("draws one band for each phase, the roof not counted, in the type's element", () => {
    const spring = towerSpotOf(projectOf("spring-cleaning", SPRING_FLOORS()), "adventure");
    expect(spring.sceneId).toBe(projectTowerSceneId(PROJECT_TYPES["spring-cleaning"].phases.length, "wind"));

    const moving = PROJECT_TYPES["moving-out"];
    const keep = towerSpotOf(projectOf("moving-out", [floorOf("1F", "x", { wokenAt: "2027-04-01T09:00:00.000Z" }), floorOf("2F", "roof")]), "adventure");
    expect(keep.sceneId).toBe(projectTowerSceneId(1, moving.element));
  });

  it("is a scene the voxel shapes know how to draw", () => {
    const { sceneId } = towerSpotOf(projectOf("spring-cleaning", SPRING_FLOORS()), "adventure");
    expect(getBuildingBoxes(sceneId).length).toBeGreaterThan(10);
  });

  it("falls back to a plain name from the catalogue and the wind's colours for a type that is gone", () => {
    const spot = towerSpotOf(projectOf("gone-type" as never, SPRING_FLOORS()), "adventure");
    expect(spot.label).toBe(copyFor("projectTower.spot.fallbackName", "adventure"));
    expect(towerSpotOf(projectOf("gone-type" as never, SPRING_FLOORS()), "simple").label).toBe(copyFor("projectTower.spot.fallbackName", "simple"));
    expect(spot.sceneId).toBe(projectTowerSceneId(4, "wind"));
  });

  it("says the roof's name in the voice asked when the family is on the roof", () => {
    const onRoof = projectOf("spring-cleaning", [floorOf("1F", "declutter", { wokenAt: "2027-04-01T09:00:00.000Z", clearedAt: "2027-04-02T09:00:00.000Z" }), floorOf("2F", "roof", { wokenAt: "2027-04-02T09:00:00.000Z" })]);
    expect(towerSpotOf(onRoof, "classic").cue).toBe(`Now on 2F: ${copyFor("projectTower.roofName", "classic")}`);
  });

  it("has no cue for a record with no floors", () => {
    expect(towerSpotOf(projectOf("spring-cleaning", []), "adventure").cue).toBe("");
  });
});

const clearedOf = (id: string, clearedAt: string, typeId: ProjectRecord["typeId"] = "spring-cleaning"): ProjectRecord => ({
  ...projectOf(typeId, SPRING_FLOORS().map((floor) => ({ ...floor, clearedAt: "2027-04-09T09:00:00.000Z", wokenAt: "2027-04-01T09:00:00.000Z" }))),
  id,
  status: "cleared",
  clearedAt,
});

describe("the tower spot of a cleared project (the trophy)", () => {
  it("is named for the tower and draws every floor, with a cue for the trophy instead of a floor", () => {
    const spot = towerSpotOf(clearedOf("spring-cleaning-2027-04-01", "2027-04-09T20:00:00.000Z"), "adventure");

    expect(spot.label).toBe("The Spring Spire");
    expect(spot.sceneId).toBe(projectTowerSceneId(PROJECT_TYPES["spring-cleaning"].phases.length, "wind"));
    expect(spot.cue).toBe(copyFor("projectFinish.spot.trophy", "adventure"));
  });

  it("cues the trophy in each voice", () => {
    const cleared = clearedOf("spring-cleaning-2027-04-01", "2027-04-09T20:00:00.000Z");
    expect(towerSpotOf(cleared, "simple").cue).toBe("Trophy");
    expect(towerSpotOf(cleared, "classic").cue).toBe("Cleared");
  });
});

describe("standingProjectOf", () => {
  const OLD = clearedOf("spring-cleaning-2026-04-01", "2026-04-09T20:00:00.000Z");
  const NEW = clearedOf("moving-out-2027-04-01", "2027-04-09T20:00:00.000Z", "moving-out");

  it("is the running project while one runs, whatever was cleared before", () => {
    const running = projectOf("spring-cleaning", SPRING_FLOORS());
    expect(standingProjectOf(running, [NEW, OLD])).toBe(running);
  });

  it("is the newest cleared run when none runs: no active project but a cleared one shows the trophy", () => {
    expect(standingProjectOf(null, [OLD, NEW])?.id).toBe("moving-out-2027-04-01");
    expect(towerSpotOf(standingProjectOf(null, [OLD])!, "adventure").cue).toBe(copyFor("projectFinish.spot.trophy", "adventure"));
  });

  it("is nothing when none runs and none was cleared", () => {
    expect(standingProjectOf(null, [])).toBeNull();
    expect(standingProjectOf(null, [{ ...OLD, status: "abandoned" }])).toBeNull();
  });
});
