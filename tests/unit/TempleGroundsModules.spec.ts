import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { getTempleWorldLocation } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMeta";
import { resolveSwipeDirection, useTempleMovement } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMovement";

// Characterization: what the temple screen's pure helpers return today, pinned when they left TempleGrounds.ts

describe("getTempleWorldLocation", () => {
  it.each([
    ["wind-temple", "plains", "world-plains"],
    ["water-temple", "islands", "world-islands"],
    ["earth-temple", "forest", "world-forest"],
    ["fire-temple", "mountains", "world-mountains"],
    ["ice-temple", "ice", "world-ice"],
    ["light-temple", "sands", "world-sands"],
    ["shadow-temple", "swamps", "world-swamps"],
    ["moon-temple", "the-moon", "the-moon"],
    ["storm-temple", "clouds", "world-clouds"],
  ])("walks out of %s into %s (%s)", (templeId, world, route) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world, route });
  });

  it.each(["gen-pantry-31", "", "WIND-TEMPLE"])("sends %p, which it does not know, home to town", (templeId) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world: "plains", route: "home-town" });
  });
});

describe("resolveSwipeDirection", () => {
  it("drags the world: a swipe right goes west, a swipe left goes east", () => {
    expect(resolveSwipeDirection(80, 10)).toBe("west");
    expect(resolveSwipeDirection(-80, 10)).toBe("east");
  });

  it("a swipe down goes north, a swipe up goes south", () => {
    expect(resolveSwipeDirection(10, 80)).toBe("north");
    expect(resolveSwipeDirection(10, -80)).toBe("south");
  });

  it("reads a diagonal by its longer side, and a tie as vertical", () => {
    expect(resolveSwipeDirection(60, -59)).toBe("west");
    expect(resolveSwipeDirection(-59, 60)).toBe("north");
    expect(resolveSwipeDirection(50, 50)).toBe("north");
    expect(resolveSwipeDirection(-50, -50)).toBe("south");
  });

  it("reads no movement at all as south", () => {
    expect(resolveSwipeDirection(0, 0)).toBe("south");
  });
});

describe("useTempleMovement: what a tap or a swipe toward each kind of side does", () => {
  /** The hero in the middle of a room, every side open; `kind` is what the temple calls the side that is tried */
  const walk = (kind: string, { locked = false } = {}) => {
    const deps = {
      props: { temple: "t" } as never,
      templeSystem: { doorKind: jest.fn(() => kind) } as never,
      currentPosition: ref<[number, number]>([1, 1]),
      canMoveUp: ref(true),
      canMoveDown: ref(true),
      canMoveLeft: ref(true),
      canMoveRight: ref(true),
      isDoorLocked: jest.fn(() => locked),
      move: jest.fn(() => true),
      fx: jest.fn(),
      updateBg: jest.fn(),
      showLockedDoor: jest.fn(),
      showCrackedWall: jest.fn(),
      arrive: jest.fn(),
    };
    let movement!: ReturnType<typeof useTempleMovement>;
    mount(
      defineComponent({
        setup: () => {
          movement = useTempleMovement(deps as never);
          return () => null;
        },
      })
    );
    deps.updateBg.mockClear(); // the mount puts the floor under the hero
    return { deps, movement };
  };

  it("brings a cracked wall up close, and neither steps nor slides the floor", () => {
    const { deps, movement } = walk("bombable");

    movement.handleMove("north");

    expect(deps.showCrackedWall).toHaveBeenCalledWith("north");
    expect(deps.move).not.toHaveBeenCalled();
    expect(deps.updateBg).not.toHaveBeenCalled();
    expect(deps.showLockedDoor).not.toHaveBeenCalled();
  });

  it("brings a cracked wall up before a lock on the same side", () => {
    const { deps, movement } = walk("bombable", { locked: true });

    movement.handleMove("east");

    expect(deps.showCrackedWall).toHaveBeenCalledWith("east");
    expect(deps.showLockedDoor).not.toHaveBeenCalled();
  });

  it("brings a cracked wall up for a swipe toward it, as for a tap", () => {
    const { deps, movement } = walk("bombable");

    movement.handleTouchStart({ changedTouches: [{ clientX: 200, clientY: 300 }] } as never);
    movement.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 300 }] } as never); // a swipe left goes east

    expect(deps.showCrackedWall).toHaveBeenCalledWith("east");
    expect(deps.move).not.toHaveBeenCalled();
  });

  it("steps through an open side", () => {
    const { deps, movement } = walk("open");

    movement.handleMove("south");

    expect(deps.showCrackedWall).not.toHaveBeenCalled();
    expect(deps.move).toHaveBeenCalledWith("south");
    expect(deps.fx).toHaveBeenCalledWith("step");
  });

  it("still brings a locked door and the boss door up as doors", () => {
    const locked = walk("locked", { locked: true });
    locked.movement.handleMove("west");
    expect(locked.deps.showLockedDoor).toHaveBeenCalledWith("west");
    expect(locked.deps.showCrackedWall).not.toHaveBeenCalled();

    const boss = walk("master");
    boss.movement.handleMove("east");
    expect(boss.deps.showLockedDoor).toHaveBeenCalledWith("east");
  });
});
