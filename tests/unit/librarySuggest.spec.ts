import {
  adoptLibraryBeast,
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
});
