import {
  adoptLibraryBeast,
  beastTheme,
  browseLibrary,
  isClassicBeast,
  keywords,
  libraryRooms,
  matchScore,
  suggestBeasts,
} from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";

const names = (beasts: { name: string }[]) => beasts.map((b) => b.name);

describe("library suggestions for a quest", () => {
  it("reads the meaningful words of a quest name", () => {
    expect(keywords("Load the dishwasher!")).toEqual(["load", "dishwasher"]);
    expect(keywords("Pull the weeds, roots and all")).toEqual(["pull", "weed", "root"]);
  });

  it("puts the beast of the chore first when the quest names it", () => {
    expect(names(suggestBeasts("Load the dishwasher"))[0]).toBe("Dish Goblin");
    expect(names(suggestBeasts("Brush your teeth"))[0]).toBe("Fang Fairy");
    expect(names(suggestBeasts("Walk the dog"))[0]).toBe("Zoomie Zephyr");
    expect(names(suggestBeasts("Make the bed"))[0]).toBe("Bed Basilisk");
    expect(names(suggestBeasts("Rake the leaves"))[0]).toBe("Leaf Lion");
  });

  it("lets the thing being done outrank the thing it is done to: Feed the dog is not a walk", () => {
    expect(names(suggestBeasts("Feed the dog", 1))).toEqual(["Kibble Kobold"]);
    expect(names(suggestBeasts("Feed the cat", 1))).toEqual(["Kibble Kobold"]);
    expect(names(suggestBeasts("Walk the dog", 1))).toEqual(["Zoomie Zephyr"]);
    expect(names(suggestBeasts("Scoop the dog poop", 1))).toEqual(["Plop Golem"]);
    expect(names(suggestBeasts("Brush the dog", 1))).toEqual(["Furball Fiend"]);
    // the walk is still on offer under Change, just not first
    expect(names(suggestBeasts("Feed the dog", 3))).toEqual(["Kibble Kobold", "Zoomie Zephyr", "Plop Golem"]);
  });

  it("scores a verb that matches the chore, and a phrase that fits whole, above a lone noun", () => {
    const feed = BEAST_LIBRARY.find((b) => b.name === "Kibble Kobold")!;
    const walk = BEAST_LIBRARY.find((b) => b.name === "Zoomie Zephyr")!;
    expect(matchScore(feed, "Feed the dog")).toBeGreaterThan(matchScore(walk, "Feed the dog"));
    expect(matchScore(walk, "Walk the dog")).toBeGreaterThan(matchScore(feed, "Walk the dog"));
    // a lone noun still finds its chores: the dog is walked, scooped and fed
    expect(matchScore(walk, "dog")).toBeGreaterThan(0);
    expect(matchScore(feed, "dog")).toBeGreaterThan(0);
    expect(matchScore(walk, "dog")).toBeGreaterThan(matchScore(feed, "dog"));
  });

  it("counts a synonym for less than the word the Game Master typed", () => {
    const vacuum = BEAST_LIBRARY.find((b) => b.name === "Fluffalo")!;
    expect(matchScore(vacuum, "Vacuum the floor")).toBeGreaterThan(matchScore(vacuum, "Hoover the floor"));
    expect(matchScore(vacuum, "Hoover the lounge")).toBeGreaterThan(0);
  });

  it("understands the words a parent would use", () => {
    expect(names(suggestBeasts("Take out the trash", 2))).toEqual(expect.arrayContaining(["Garbage Gargoyle"]));
    expect(names(suggestBeasts("Hoover the lounge", 3))).toContain("Fluffalo");
    expect(names(suggestBeasts("Pyjamas and get dressed", 3))).toContain("Pajama Pooka");
  });

  it("suggests nothing for a quest that is no chore at all", () => {
    expect(suggestBeasts("Defeat the final boss of Hyrule")).toEqual([]);
    expect(suggestBeasts("")).toEqual([]);
  });

  it("caps the list, keeps library order on ties and can leave out beasts the family already has", () => {
    expect(suggestBeasts("Clean", 4)).toHaveLength(4);
    const dish = BEAST_LIBRARY.find((b) => b.name === "Dish Goblin")!;
    expect(names(suggestBeasts("Load the dishwasher", 6, { exclude: [String(dish.id)] }))).not.toContain("Dish Goblin");
    expect(matchScore(dish, "Load the dishwasher")).toBeGreaterThan(matchScore(dish, "Wipe the table"));
  });

  it("browses by room, age band and text", () => {
    expect(libraryRooms()).toContain("kitchen");
    expect(browseLibrary({ room: "kitchen" }).every((b) => b.room === "kitchen")).toBe(true);
    expect(browseLibrary({ age: "teen" }).every((b) => b.age === "teen")).toBe(true);
    expect(names(browseLibrary({ text: "sock" }))).toEqual(expect.arrayContaining(["Socktopus"]));
    expect(browseLibrary()).toHaveLength(BEAST_LIBRARY.length + CLASSIC_BEASTS.length);
  });

  it("browses the classic beasts with the rest, chore beasts first", () => {
    const all = browseLibrary();
    expect(all.slice(0, BEAST_LIBRARY.length)).toEqual(BEAST_LIBRARY);
    expect(all.slice(BEAST_LIBRARY.length).every(isClassicBeast)).toBe(true);
    expect(browseLibrary({ classic: true })).toEqual(CLASSIC_BEASTS);
    expect(browseLibrary({ classic: false })).toEqual(BEAST_LIBRARY);
  });

  it("finds a classic beast by its name, and the room and age filters leave the classics out", () => {
    expect(names(browseLibrary({ text: "ronan" }))).toEqual(["Moanin Ronan"]);
    expect(browseLibrary({ text: "classic beast 012" })).toHaveLength(1);
    expect(browseLibrary({ text: "classic" })).toHaveLength(CLASSIC_BEASTS.length - 1); // all but the named Moanin Ronan
    expect(browseLibrary({ room: "kitchen" }).some(isClassicBeast)).toBe(false);
    expect(browseLibrary({ age: "little" }).some(isClassicBeast)).toBe(false);
  });

  it("does not search the filler task list every classic beast shares", () => {
    expect(browseLibrary({ text: "check that it is done" }).some(isClassicBeast)).toBe(false);
  });

  it("can leave out classic beasts the family already has", () => {
    const ronan = CLASSIC_BEASTS.find((b) => b.avatar === 50)!;
    expect(names(browseLibrary({ classic: true, exclude: [String(ronan.id)] }))).not.toContain("Moanin Ronan");
    expect(browseLibrary({ classic: true, exclude: [String(ronan.id)] })).toHaveLength(CLASSIC_BEASTS.length - 1);
  });

  it("suggests a classic beast only by a name the family gave it, never by its placeholder or filler", () => {
    expect(names(suggestBeasts("Ronan"))).toEqual(["Moanin Ronan"]);
    expect(names(suggestBeasts("Moanin Ronan", 3))[0]).toBe("Moanin Ronan");
    expect(suggestBeasts("Classic beast 012")).toEqual([]);
    expect(suggestBeasts("Check that it is done").some(isClassicBeast)).toBe(false);
    expect(matchScore(CLASSIC_BEASTS[0], "Do the chore")).toBe(0);
  });

  it("adopts a library beast as a plain bestiary beast with a stable id and its own copy of the task list", () => {
    const sock = BEAST_LIBRARY.find((b) => b.name === "Socktopus")!;
    const adopted = adoptLibraryBeast(sock);
    expect(adopted.id).toBe("beast-socktopus");
    expect(adopted).not.toHaveProperty("chore");
    expect(adopted.checklist).toEqual(sock.checklist);
    expect(adopted.checklist).not.toBe(sock.checklist);
    expect(adopted.avatar).toBe(sock.avatar);
  });

  it("adopts a classic beast the same way, under its own stable id, with its art and nothing library-only", () => {
    const ronan = CLASSIC_BEASTS.find((b) => b.avatar === 50)!;
    const adopted = adoptLibraryBeast(ronan);
    expect(adopted).toMatchObject({ id: "beast-classic-050", name: "Moanin Ronan", avatar: 50 });
    expect(adopted).not.toHaveProperty("element");
    expect(adopted).not.toHaveProperty("classic");
    expect(adopted).not.toHaveProperty("slug");
    expect(adopted).not.toHaveProperty("variantAvatar");
    expect(adopted.checklist).toEqual(ronan.checklist);
    expect(adopted.checklist).not.toBe(ronan.checklist);
  });

  it("browses one temple theme at a time, chore beasts only", () => {
    const shadow = browseLibrary({ theme: "shadow" });
    expect(shadow).toHaveLength(12);
    expect(shadow.every((b) => !isClassicBeast(b) && b.theme === "shadow")).toBe(true);
    expect(names(shadow)).toEqual(expect.arrayContaining(["Dish Goblin", "Trash Troll"]));
    expect(browseLibrary({ theme: "water" }).every((b) => !isClassicBeast(b) && b.room === "bathroom")).toBe(true);
    expect(browseLibrary({ theme: "storm", classic: true })).toEqual([]);
  });

  it("keeps the classic beasts out of every theme filter", () => {
    for (const theme of ["wind", "earth", "water", "fire", "ice", "light", "shadow", "moon", "storm"] as const) {
      expect(browseLibrary({ theme }).some(isClassicBeast)).toBe(false);
    }
    expect(browseLibrary({ theme: "moon", text: "classic" })).toEqual([]);
    expect(browseLibrary({ theme: "moon", text: "ronan" })).toEqual([]);
  });

  it("combines the theme with text, room, age and the beasts the family already has", () => {
    expect(names(browseLibrary({ theme: "shadow", text: "dish" }))).toEqual(
      expect.arrayContaining(["Dish Goblin", "Suds Serpent"]));
    expect(browseLibrary({ theme: "shadow", text: "dish" }).every((b) => b.theme === "shadow")).toBe(true);
    expect(browseLibrary({ theme: "shadow", room: "bathroom" })).toEqual([]);
    expect(browseLibrary({ theme: "shadow", age: "little" }).every((b) => b.theme === "shadow" && b.age === "little")).toBe(true);
    const dish = BEAST_LIBRARY.find((b) => b.name === "Dish Goblin")!;
    expect(names(browseLibrary({ theme: "shadow", exclude: [String(dish.id)] }))).not.toContain("Dish Goblin");
    expect(browseLibrary({ theme: "shadow", exclude: [String(dish.id)] })).toHaveLength(11);
  });

  it("suggests only inside a theme when asked", () => {
    expect(names(suggestBeasts("Load the dishwasher", 3, { theme: "shadow" }))[0]).toBe("Dish Goblin");
    expect(names(suggestBeasts("Load the dishwasher", 6, { theme: "ice" }))).not.toContain("Dish Goblin");
    expect(suggestBeasts("Brush your teeth", 6, { theme: "ice" }).every((b) => !isClassicBeast(b) && b.theme === "ice")).toBe(true);
    expect(suggestBeasts("Ronan", 6, { theme: "moon" })).toEqual([]);
    expect(names(suggestBeasts("Brush your teeth", 1, { theme: "moon" }))).toEqual(["Fang Fairy"]);
  });

  it("copies the theme when a library beast is adopted, and gives a classic beast none", () => {
    const dish = BEAST_LIBRARY.find((b) => b.name === "Dish Goblin")!;
    expect(adoptLibraryBeast(dish)).toMatchObject({ id: "beast-dish-goblin", element: "water", theme: "shadow" });
    for (const beast of BEAST_LIBRARY) expect(adoptLibraryBeast(beast).theme).toBe(beast.theme);
    expect(adoptLibraryBeast(CLASSIC_BEASTS[0])).not.toHaveProperty("theme");
  });

  it("reads the theme of a beast the family owns from the beast, or else from the library by id", () => {
    expect(beastTheme({ id: "beast-dish-goblin" })).toBe("shadow");
    expect(beastTheme({ id: "beast-dish-goblin", theme: "fire" })).toBe("fire");
    expect(beastTheme({ id: "beast-classic-050" })).toBeUndefined();
    expect(beastTheme({ id: "a-custom-beast" })).toBeUndefined();
    expect(beastTheme({})).toBeUndefined();
  });
});
