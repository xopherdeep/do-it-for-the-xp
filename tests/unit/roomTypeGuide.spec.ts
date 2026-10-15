import fs from "fs";
import path from "path";
import { ROOM_ICONS, MASTER_EGG_ICON } from "@/lib/engine/dungeons/roomTypes";
import { questTier } from "@/lib/services/temples/questRooms";
import { ITEM_METADATA, getItemMetadata } from "@/lib/engine/core/items/itemRegistry";
import {
  DUNGEON_ITEMS,
  ROOM_CATEGORIES,
  categoryOfRoomType,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomEditor";
import {
  CATEGORY_BLURBS,
  CRITICAL_PATH,
  DEFAULT_ROOM_GUIDE,
  ROOM_TYPE_GUIDE,
  canonicalRoomType,
  categoryBlurb,
  criticalPathStops,
  hasRoomTypeGuide,
  isOnCriticalPath,
  QUEST_PATH_NOTE,
  roomTypeGuide,
  roomTypeShortLabel,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/roomTypeGuide";

/**
 * The room type guide behind the full-screen room type picker: every pickable type is explained, the Master Room is
 * the Pegasus Egg room (not a key room), and the critical path lights the stop a room belongs to.
 */
const everyPickableType = ROOM_CATEGORIES.flatMap((category) => [...category.types, ...(category.classic ?? [])]);

describe("the guide covers the picker", () => {
  it("has an entry for every type in every category", () => {
    everyPickableType.forEach((type) => {
      expect(ROOM_TYPE_GUIDE[type]).toBeDefined();
      expect(hasRoomTypeGuide(type)).toBe(true);
    });
  });

  it("writes every entry in full: label, icon, a blurb, what happens in play and where it goes", () => {
    Object.entries(ROOM_TYPE_GUIDE).forEach(([type, entry]) => {
      expect([type, entry.label.trim()]).not.toEqual([type, ""]);
      expect([type, entry.blurb.trim()]).not.toEqual([type, ""]);
      expect([type, entry.inPlay.trim()]).not.toEqual([type, ""]);
      expect([type, entry.place.trim()]).not.toEqual([type, ""]);
      expect(entry.icon.split(/\s+/)[0]).toMatch(/^fa-[a-z0-9-]+$/);
    });
  });

  it("gives every pickable type a label of its own", () => {
    const labels = everyPickableType.map((type) => ROOM_TYPE_GUIDE[type].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("only uses icons that ship in the bundled Font Awesome duotone set", () => {
    const fontAwesome = path.resolve(__dirname, "../../src/assets/fonts/font-awesome");
    const allCss = fs.readFileSync(path.join(fontAwesome, "css/all.css"), "utf8");
    Object.values(ROOM_TYPE_GUIDE).forEach((entry) => {
      const iconClass = entry.icon.split(/\s+/)[0];
      expect(allCss).toContain(`.${iconClass}:before`);
      expect(fs.existsSync(path.join(fontAwesome, "svgs/duotone", `${iconClass.slice(3)}.svg`))).toBe(true);
    });
  });

  it("never lists a type twice, in the rail or among the classic rooms", () => {
    expect(new Set(everyPickableType).size).toBe(everyPickableType.length);
  });

  it("has the five categories, each with a one-line purpose", () => {
    expect(ROOM_CATEGORIES.map((category) => category.name)).toEqual(["Combat", "Resources", "Recovery", "Navigation", "Structure"]);
    ROOM_CATEGORIES.forEach((category) => {
      expect(CATEGORY_BLURBS[category.name]).toBeTruthy();
      expect(categoryBlurb(category.name)).toBe(CATEGORY_BLURBS[category.name]);
    });
    expect(categoryBlurb("nope")).toBe("");
  });
});

describe("Combat leads with the quest room", () => {
  const combat = ROOM_CATEGORIES.find((category) => category.name === "Combat");

  it("lists Quest room first, then Trap, and keeps the beast rooms as they were under Classic", () => {
    expect(combat?.types).toEqual(["quest", "trap"]);
    expect(combat?.classic).toEqual(["monster", "miniboss", "boss"]);
  });

  it("finds the category of a classic beast room as well as of a listed one", () => {
    expect(categoryOfRoomType("quest")?.name).toBe("Combat");
    expect(categoryOfRoomType("trap")?.name).toBe("Combat");
    ["monster", "miniboss", "boss"].forEach((type) => expect(categoryOfRoomType(type)?.name).toBe("Combat"));
    expect(categoryOfRoomType("loot")?.name).toBe("Resources");
    expect(categoryOfRoomType("dragon-egg")?.name).toBe("Resources");
    expect(categoryOfRoomType("nope")).toBeUndefined();
  });

  it("explains the quest room as a guide entry: it is not an engine type, and its difficulty makes the tier", () => {
    const quest = roomTypeGuide("quest");
    expect(hasRoomTypeGuide("quest")).toBe(true);
    expect(quest.label).toBe("Quest room");
    expect(roomTypeShortLabel("quest")).toBe("Quest");
    expect(quest.inPlay).toMatch(/checklist/i);
    expect(quest.inPlay).toMatch(/back when the quest is due again/i);
    expect(quest.place).toMatch(/Monster, Miniboss or Boss/);
    expect(quest.needs).toMatch(/quest/i);
  });

  it("tells the tier thresholds the way the rules draw them", () => {
    expect(QUEST_PATH_NOTE).toContain("1-2");
    expect(QUEST_PATH_NOTE).toContain("3-5");
    expect(QUEST_PATH_NOTE).toContain("8");
    expect([1, 2].map(questTier)).toEqual(["monster", "monster"]);
    expect([3, 5].map(questTier)).toEqual(["miniboss", "miniboss"]);
    expect(questTier(8)).toBe("boss");
  });

  it("says the classic beast rooms are classic, without changing their names", () => {
    expect(roomTypeGuide("monster").label).toBe("Monster");
    expect(roomTypeGuide("miniboss").label).toBe("Mini-boss");
    expect(roomTypeGuide("boss").label).toBe("Boss");
    ["monster", "miniboss"].forEach((type) => expect(roomTypeGuide(type).inPlay).toMatch(/classic/i));
  });
});

describe("the Master Room is the Pegasus Egg room", () => {
  it("keeps `master` in Resources and never offers the older `dragon-egg`", () => {
    const resources = ROOM_CATEGORIES.find((category) => category.name === "Resources");
    expect(resources?.types).toEqual(["loot", "key", "master", "shop"]);
    expect(everyPickableType).not.toContain("dragon-egg");
  });

  it("shares one egg entry between `master` and `dragon-egg`", () => {
    expect(ROOM_TYPE_GUIDE["dragon-egg"]).toBe(ROOM_TYPE_GUIDE.master);
    expect(roomTypeGuide("dragon-egg")).toEqual(roomTypeGuide("master"));
    expect(canonicalRoomType("dragon-egg")).toBe("master");
    expect(canonicalRoomType("master")).toBe("master");
    expect(canonicalRoomType("loot")).toBe("loot");
    expect(canonicalRoomType(undefined)).toBe("");
  });

  it("calls it the Master Room (Pegasus Egg), short name Master Room, and says it holds the egg, after the boss", () => {
    const master = roomTypeGuide("master");
    expect(master.label).toBe("Master Room (Pegasus Egg)");
    expect(master.short).toBe("Master Room");
    expect(roomTypeShortLabel("master")).toBe("Master Room");
    expect(roomTypeShortLabel("dragon-egg")).toBe("Master Room");
    expect(roomTypeShortLabel("boss")).toBe("Boss");
    expect(roomTypeShortLabel("nope")).toBe(DEFAULT_ROOM_GUIDE.label);
    expect(master.blurb).toContain("Pegasus Egg");
    expect(master.inPlay).toContain("Pegasus");
    expect(master.place).toBe("Right AFTER the boss.");
  });

  it("draws it as a golden egg, one icon for the picker and every room-type icon table", () => {
    expect(roomTypeGuide("master").icon).toBe(MASTER_EGG_ICON);
    expect(MASTER_EGG_ICON.split(/\s+/)).toEqual(["fa-egg", "icon-master-egg"]);
    expect(ROOM_ICONS.master).toBe(MASTER_EGG_ICON);
  });

  it("puts the two golds of the egg in the shared icon stylesheet", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../src/styles/icons/_icon-colors.scss"), "utf8");
    const rule = css.match(/\.icon-master-egg\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[1]).toContain("--fa-primary-color: #f7e8a8");
    expect(rule?.[1]).toContain("--fa-secondary-color: #c9a227");
    expect(rule?.[1]).toContain("--fa-secondary-opacity: 1");
  });

  it("keeps the Boss Key out of the room list: it is a Chest item", () => {
    expect(Object.keys(ROOM_TYPE_GUIDE)).not.toContain("master-key");
    expect(Object.keys(ROOM_TYPE_GUIDE)).not.toContain("boss-key");
    expect(roomTypeGuide("loot").inPlay).toContain("Dungeon Item → Boss Key");
    expect(roomTypeGuide("boss").needs).toBe("Needs a Chest holding the Boss Key before its door.");
    // The Master Room is not a key room
    expect(roomTypeGuide("master").inPlay).not.toMatch(/key/i);
    expect(roomTypeGuide("key").label).toBe("Small Key");
  });

  it("never calls the boss door's key the Master Key in the copy a parent reads", () => {
    const copy = Object.values(ROOM_TYPE_GUIDE)
      .flatMap((entry) => [entry.label, entry.short, entry.blurb, entry.inPlay, entry.place, entry.needs])
      .concat(CRITICAL_PATH.map((stop) => stop.label));
    copy.forEach((line) => expect(line ?? "").not.toMatch(/master key/i));
  });

  it("names the chest item Boss Key, keeping its id `master-key`", () => {
    const bossKey = DUNGEON_ITEMS.find((item) => item.id === "master-key");
    expect(bossKey?.label).toBe("Boss Key");
    expect(DUNGEON_ITEMS.map((item) => item.label)).not.toContain("Master Key");
  });
});

describe("roomTypeGuide", () => {
  it("returns the default for a type it does not know", () => {
    expect(roomTypeGuide("nope")).toBe(DEFAULT_ROOM_GUIDE);
    expect(roomTypeGuide("")).toBe(DEFAULT_ROOM_GUIDE);
    expect(roomTypeGuide(undefined)).toBe(DEFAULT_ROOM_GUIDE);
    expect(roomTypeGuide(null)).toBe(DEFAULT_ROOM_GUIDE);
    expect(hasRoomTypeGuide("nope")).toBe(false);
  });

  it("does not mistake object prototype names for room types", () => {
    expect(roomTypeGuide("constructor")).toBe(DEFAULT_ROOM_GUIDE);
    expect(roomTypeGuide("toString")).toBe(DEFAULT_ROOM_GUIDE);
  });
});

describe("the critical path", () => {
  const labels = () => CRITICAL_PATH.map((stop) => stop.label);
  const lit = (type: string) => criticalPathStops(type).filter((stop) => stop.active).map((stop) => stop.label);

  it("always reads from the entrance to the gate, the Master Room right after the boss", () => {
    expect(labels()).toEqual([
      "Entrance",
      "Keys and locks",
      "Mini-boss",
      "Chest with the Boss Key",
      "Boss door",
      "Boss",
      "Master Room (Pegasus Egg)",
      "Gate",
    ]);
    // The same eight stops whichever room is picked
    ["monster", "boss", "master", "nope", ""].forEach((type) => {
      expect(criticalPathStops(type).map((stop) => stop.label)).toEqual(labels());
    });
  });

  it("lights the stop a room belongs to", () => {
    expect(lit("entrance")).toEqual(["Entrance"]);
    expect(lit("key")).toEqual(["Keys and locks"]);
    expect(lit("miniboss")).toEqual(["Mini-boss"]);
    expect(lit("loot")).toEqual(["Chest with the Boss Key"]);
    expect(lit("boss")).toEqual(["Boss door", "Boss"]);
    expect(lit("master")).toEqual(["Master Room (Pegasus Egg)"]);
    expect(lit("gate")).toEqual(["Gate"]);
  });

  it("lights the Master Room for its older name too", () => {
    expect(lit("dragon-egg")).toEqual(lit("master"));
  });

  it("lights nothing for a room that can go anywhere", () => {
    ["quest", "monster", "trap", "shop", "health", "mana", "save", "camp", "teleport", "puzzle", "secret", "empty", "wall", "pit", "void"].forEach((type) => {
      expect(lit(type)).toEqual([]);
      expect(isOnCriticalPath(type)).toBe(false);
    });
    expect(isOnCriticalPath("master")).toBe(true);
    expect(isOnCriticalPath("boss")).toBe(true);
  });
});

describe("the Boss Key in the item registry and the legend", () => {
  it("names the boss door's key Boss Key, keeping its id `master-key`", () => {
    expect(getItemMetadata("master-key")?.name).toBe("Boss Key");
    expect(getItemMetadata("master-key")?.icon).toBe("key-skeleton");
  });

  it("has no item whose name or description calls a key the Master Key", () => {
    Object.values(ITEM_METADATA).forEach((item) => {
      expect(item.name).not.toMatch(/master key/i);
      expect(item.description).not.toMatch(/master key/i);
    });
  });

  it("says the Wind Whistle comes from the Wind Temple, not from Ventus", () => {
    const whistle = getItemMetadata("wind-whistle");
    expect(whistle?.description).toBe("A mystical whistle from the Wind Temple. Summon the Sacred Pegasi for fast travel!");
    expect(whistle?.description).not.toMatch(/ventus/i);
  });

  it("lists the Master Room in the room legend, beside the other rooms, with the golden egg", () => {
    const legend = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/RoomLegendModal.vue"),
      "utf8"
    );
    expect(legend).toContain("label: 'Master Room'");
    expect(legend).toContain("icon: ROOM_ICONS.master");
    expect(legend).toContain("The Pegasus Egg chamber, after the boss");
    expect(legend).toContain("Boss Key");
    expect(legend).not.toMatch(/master key/i);
  });
});

describe("the room icons exist in the bundled Font Awesome", () => {
  const fontAwesome = path.resolve(__dirname, "../../src/assets/fonts/font-awesome");
  const allCss = fs.readFileSync(path.join(fontAwesome, "css/all.css"), "utf8");
  const exists = (icon: string) => {
    const iconClass = icon.split(/\s+/)[0];
    return allCss.includes(`.${iconClass}:before`) && fs.existsSync(path.join(fontAwesome, "svgs/duotone", `${iconClass.slice(3)}.svg`));
  };

  it("gives the stairs and the pit icons that ship in the font (fa-stairs and fa-hole do not)", () => {
    expect(ROOM_ICONS["stairs-up"]).toBe("fa-arrow-alt-circle-up");
    expect(ROOM_ICONS["stairs-down"]).toBe("fa-arrow-alt-circle-down");
    expect(ROOM_ICONS.pit).toBe("fa-dot-circle");
    ["stairs-up", "stairs-down", "pit"].forEach((type) => {
      expect([type, exists((ROOM_ICONS as Record<string, string>)[type])]).toEqual([type, true]);
    });
    expect(exists("fa-stairs")).toBe(false);
    expect(exists("fa-hole")).toBe(false);
  });

  it("draws every room type with an icon that ships in the font", () => {
    Object.entries(ROOM_ICONS).forEach(([type, icon]) => {
      expect([type, exists(icon)]).toEqual([type, true]);
    });
  });
});
