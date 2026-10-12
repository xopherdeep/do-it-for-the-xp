/**
 * Characterization of the door-side rules the room page uses (hooks/grid/doorSides): the plain defaults, the legacy
 * `locked` flags, the boss lock, the order a tap cycles through, and the icon and class each door is drawn with.
 */
import {
  DOOR_STATE_INFO,
  defaultSides,
  doorClassFor,
  doorIconFor,
  doorToastIcon,
  hasNonDoorSide,
  legacyLockedToSides,
  lockBossSides,
  nextDoorState,
  resolveSideIcon,
  type DoorFacts,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/doorSides";

describe("defaultSides", () => {
  it("is four plain doors, a fresh object each time", () => {
    const first = defaultSides();
    expect(first).toEqual({ north: "door", east: "door", south: "door", west: "door" });
    first.north = "wall";
    expect(defaultSides().north).toBe("door");
  });
});

describe("legacyLockedToSides", () => {
  it("turns each truthy flag into a lock and every other side into a door", () => {
    expect(legacyLockedToSides({ north: true, south: false })).toEqual({
      north: "locked",
      east: "door",
      south: "door",
      west: "door",
    });
  });

  it("turns an empty flag set into four doors", () => {
    expect(legacyLockedToSides({})).toEqual(defaultSides());
  });
});

describe("hasNonDoorSide", () => {
  it("is true when any side is not a plain door", () => {
    expect(hasNonDoorSide({ north: "door", east: "wall" })).toBe(true);
    expect(hasNonDoorSide({ north: "masterlocked" })).toBe(true);
  });

  it("is false for plain doors and for no sides", () => {
    expect(hasNonDoorSide(defaultSides())).toBe(false);
    expect(hasNonDoorSide({})).toBe(false);
  });
});

describe("lockBossSides", () => {
  it("turns doors and small locks into the boss lock and leaves other sides", () => {
    expect(lockBossSides({ north: "door", east: "locked", south: "bombable", west: "wall" })).toEqual({
      north: "masterlocked",
      east: "masterlocked",
      south: "bombable",
      west: "wall",
    });
  });

  it("returns a copy and leaves the sides it is given alone", () => {
    const sides = defaultSides();
    const locked = lockBossSides(sides);
    expect(locked).not.toBe(sides);
    expect(sides).toEqual(defaultSides());
  });

  it("leaves a side that is already the boss lock", () => {
    expect(lockBossSides({ north: "masterlocked" })).toEqual({ north: "masterlocked" });
  });
});

describe("nextDoorState", () => {
  it("steps door, locked, bombable, wall and round again", () => {
    expect(nextDoorState("door")).toBe("locked");
    expect(nextDoorState("locked")).toBe("bombable");
    expect(nextDoorState("bombable")).toBe("wall");
    expect(nextDoorState("wall")).toBe("door");
  });

  it("restarts any other state at the door", () => {
    expect(nextDoorState("masterlocked")).toBe("door");
    expect(nextDoorState("")).toBe("door");
  });
});

describe("DOOR_STATE_INFO", () => {
  it("has toast text for each state a tap can reach", () => {
    expect(DOOR_STATE_INFO).toEqual({
      door: { icon: "far fa-tombstone-alt", label: "Open Passage", color: "success" },
      locked: { icon: "fas fa-lock", label: "Locked Door", color: "warning" },
      bombable: { icon: "fal fa-bomb", label: "Bombable Wall", color: "secondary" },
      wall: { icon: "DYNAMIC_WALL", label: "Solid Wall", color: "medium" },
    });
  });
});

describe("resolveSideIcon", () => {
  it("leaves a real icon alone", () => {
    expect(resolveSideIcon("fas fa-lock", "wall")).toBe("fas fa-lock");
  });

  it("resolves the wall icon to wind for a wall wall and a dungeon door otherwise", () => {
    expect(resolveSideIcon("DYNAMIC_WALL", "wall")).toBe("fa-wind");
    expect(resolveSideIcon("DYNAMIC_WALL", "entrance")).toBe("fa-dungeon");
    expect(resolveSideIcon("DYNAMIC_WALL")).toBe("fa-dungeon");
  });
});

describe("doorToastIcon", () => {
  it("drops the font family prefix", () => {
    expect(doorToastIcon("fas fa-lock")).toBe("fa-lock");
    expect(doorToastIcon("fal fa-bomb")).toBe("fa-bomb");
    expect(doorToastIcon("fad fa-dungeon")).toBe("fa-dungeon");
  });

  it("does not strip the 'far' prefix", () => {
    expect(doorToastIcon("far fa-tombstone-alt")).toBe("far fa-tombstone-alt");
  });

  it("always shows the wind icon for the wall, whatever the wall type", () => {
    expect(doorToastIcon("DYNAMIC_WALL")).toBe("fa-wind");
    expect(doorToastIcon("DYNAMIC_WALL", "wall")).toBe("fa-wind");
    expect(doorToastIcon("DYNAMIC_WALL", "entrance")).toBe("fa-wind");
  });
});

describe("doorIconFor", () => {
  const facts = (over: Partial<DoorFacts> = {}): DoorFacts => ({
    state: "door",
    neighborIsWall: false,
    roomType: "monster",
    lockOnEnter: false,
    adjacentType: "empty",
    ...over,
  });

  it("is the wall icon for a wall side or a wall neighbour, before anything else", () => {
    expect(doorIconFor(facts({ state: "wall" }))).toBe("DYNAMIC_WALL");
    expect(doorIconFor(facts({ neighborIsWall: true }))).toBe("DYNAMIC_WALL");
    expect(doorIconFor(facts({ state: "masterlocked", neighborIsWall: true }))).toBe("DYNAMIC_WALL");
  });

  it("is the skull for the boss lock", () => {
    expect(doorIconFor(facts({ state: "masterlocked" }))).toBe("fas fa-skull");
    expect(doorIconFor(facts({ state: "masterlocked", roomType: "boss" }))).toBe("fas fa-skull");
  });

  it("is the dungeon door for a trapped room, with the entrance variant next to an entrance", () => {
    expect(doorIconFor(facts({ roomType: "boss" }))).toBe("fad fa-dungeon");
    expect(doorIconFor(facts({ roomType: "miniboss", state: "locked" }))).toBe("fad fa-dungeon");
    expect(doorIconFor(facts({ lockOnEnter: true }))).toBe("fad fa-dungeon");
    expect(doorIconFor(facts({ roomType: "boss", adjacentType: "entrance" }))).toBe("fad fa-dungeon entrance-variant");
  });

  it("keeps a bombable wall bombable even in a trapped room", () => {
    expect(doorIconFor(facts({ roomType: "boss", state: "bombable" }))).toBe("fal fa-bomb");
  });

  it("is the icon of the state otherwise", () => {
    expect(doorIconFor(facts({ state: "locked" }))).toBe("fas fa-lock");
    expect(doorIconFor(facts({ state: "bombable" }))).toBe("fal fa-bomb");
    expect(doorIconFor(facts({ state: "door" }))).toBe("far fa-tombstone-alt");
    expect(doorIconFor(facts({ state: "something-else" }))).toBe("far fa-tombstone-alt");
  });

  it("does not trap a room whose type is missing and does not lock on entry", () => {
    expect(doorIconFor(facts({ roomType: undefined, lockOnEnter: undefined }))).toBe("far fa-tombstone-alt");
  });
});

describe("doorClassFor", () => {
  const facts = (over: Partial<Omit<DoorFacts, "adjacentType">> = {}) => ({
    state: "door",
    neighborIsWall: false,
    roomType: "monster",
    lockOnEnter: false,
    ...over,
  });

  it("is state-wall for a wall side or a wall neighbour", () => {
    expect(doorClassFor(facts({ state: "wall" }))).toBe("state-wall");
    expect(doorClassFor(facts({ neighborIsWall: true, state: "masterlocked" }))).toBe("state-wall");
  });

  it("is state-masterlocked for the boss lock", () => {
    expect(doorClassFor(facts({ state: "masterlocked", roomType: "boss" }))).toBe("state-masterlocked");
  });

  it("is state-trapped for a trapped room, except on a bombable wall", () => {
    expect(doorClassFor(facts({ roomType: "boss" }))).toBe("state-trapped");
    expect(doorClassFor(facts({ roomType: "miniboss", state: "locked" }))).toBe("state-trapped");
    expect(doorClassFor(facts({ lockOnEnter: true }))).toBe("state-trapped");
    expect(doorClassFor(facts({ roomType: "boss", state: "bombable" }))).toBe("state-bombable");
  });

  it("is state- and the state otherwise", () => {
    expect(doorClassFor(facts({ state: "locked" }))).toBe("state-locked");
    expect(doorClassFor(facts())).toBe("state-door");
    expect(doorClassFor(facts({ state: "odd" }))).toBe("state-odd");
  });
});
