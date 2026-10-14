import { bombView, CRACKED_WALL_HEADER } from "@/app/Console/TempleGrounds/components/bombView";

// What the cracked wall's sheet says and offers, from what the hero holds: the Bombs in a hand and a Bomb in the pack

describe("bombView", () => {
  it("offers 'Bomb it' to a hero holding the Bombs with a Bomb in the pack, and says only that the wall is cracked", () => {
    expect(bombView("north", { holdsBombs: true, bombs: 3 })).toEqual({
      side: "north",
      canBomb: true,
      header: CRACKED_WALL_HEADER,
      line: "The wall is cracked.",
      bombs: 3,
    });
  });

  it("keeps the side the control named, so the Bomb tries that wall first", () => {
    expect(bombView("west", { holdsBombs: true, bombs: 1 }).side).toBe("west");
    expect(bombView("south", { holdsBombs: false, bombs: 0 }).side).toBe("south");
  });

  it("says a Bomb would do it, and offers nothing, to a hero with no Bombs at all", () => {
    const view = bombView("east", { holdsBombs: false, bombs: 0 });

    expect(view.canBomb).toBe(false);
    expect(view.line).toBe("The wall is cracked. A Bomb would do it.");
    expect(view.bombs).toBe(0);
  });

  it("asks the hero to hold the Bombs when the pack has a Bomb but no hand does", () => {
    const view = bombView("east", { holdsBombs: false, bombs: 2 });

    expect(view.canBomb).toBe(false);
    expect(view.line).toBe("The wall is cracked. Hold the Bombs in a hand and a Bomb would do it.");
    expect(view.bombs).toBe(2);
  });

  it("says the hero is out of Bombs when the Bombs are in a hand and the pack has none", () => {
    const view = bombView("east", { holdsBombs: true, bombs: 0 });

    expect(view.canBomb).toBe(false);
    expect(view.line).toBe("The wall is cracked. You are out of Bombs.");
  });
});
