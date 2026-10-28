/**
 * The tower's spot on the Hometown plaza: its name under it, where the family is on it, and the voxel scene that draws
 * it (a narrow stack of the project's floors in its element's colours). Pure: the record and the voice go in.
 */
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { towerSpotOf } from "@/app/Console/MyPortal/HomeTown/components/towerSpot";
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

  it("falls back to a plain name and the wind's colours for a type that is gone", () => {
    const spot = towerSpotOf(projectOf("gone-type" as never, SPRING_FLOORS()), "adventure");
    expect(spot.label).toBe("Project tower");
    expect(spot.sceneId).toBe(projectTowerSceneId(4, "wind"));
  });

  it("has no cue for a record with no floors", () => {
    expect(towerSpotOf(projectOf("spring-cleaning", []), "adventure").cue).toBe("");
  });
});
