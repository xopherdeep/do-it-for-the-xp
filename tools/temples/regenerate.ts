/**
 * Writes the generated temples of src/lib/engine/temples that PLANS below still lists, from fixed seeds. The Wind
 * Temple is made by hand, and the temples that follow a classic dungeon (Storm from the Tower of Hera, Earth from
 * Skull Woods, ...) are dressed from its JSON (tools/temples/classic/dress.ts); none of those is touched here, and each
 * temple that moves to a classic dungeon leaves PLANS for classic/dressPlans.ts.
 *
 *   node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild tools/temples/regenerate.ts \
 *     --bundle --platform=node --format=cjs --outfile=/tmp/regenerate-temples.cjs && node /tmp/regenerate-temples.cjs
 *
 * (esbuild reads the "@/" paths from tsconfig.json; use the esbuild version that sits in node_modules/.pnpm.)
 *
 * Same seed and options give the same temple (R11 of docs/Temple-Generation-Contract.md), so the header of each module
 * is enough to rebuild it. To change a temple, change its plan below and run the script; then
 * `chemx test tests/unit/ShippedTemplesAudit.spec.ts` says whether the new layout still passes.
 *
 * The generator lays out the rooms; this file dresses them in the temple's own flavour (its quests, trap, riddle, shop
 * and relic) so a hero still meets the Dish Goblins of the Shadow Temple and finds Gaia's Hammer in a chest.
 *
 * Quest rooms (docs/Quest-Rooms-Spec.md sections 10 and 11): every combat room holds the quest template the plan lists,
 * bound to a library beast of the temple's theme. The monster templates go to the monster rooms in order of path
 * distance from the entrance, easiest first (a stable sort, so the plan's own order breaks ties). The wind temple is
 * edited by hand and follows the same table.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import type { RoomContent, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, reachableFrom } from "@/lib/engine/dungeons/generator/templeGraph";
import { generateTemple, type GenerateOptions, type GeneratedTemple } from "@/lib/engine/dungeons/generator/templeGenerator";
import { templateFor, type PlanQuest } from "./questPlan";
import { renderModule } from "./renderModule";

interface PlanQuests {
  /** In the order of the table of section 11; the plan is sorted easiest first when it is dealt out */
  monsters: PlanQuest[];
  /** One per miniboss room, nearest the entrance first */
  minibosses: PlanQuest[];
  boss: PlanQuest;
}

interface Plan {
  /** "Earth Temple": the name the Temple Creator lists the temple under */
  name: string;
  /** The world the temple stands in (the registry's `world`) */
  theme: string;
  element: string;
  floors: 2 | 3;
  /** The quest templates of the combat rooms (section 11); `dress` fails when the layout has other room counts */
  quests: PlanQuests;
  trap: [string, number];
  /** A riddle of RoomInteractions (`generic` when the temple has none of its own) */
  puzzle: string;
  shop?: string;
  /** Relics that replace the last chests of potions, so exploring pays */
  relics: string[];
}

const PLANS: Record<string, Plan> = {
  "fire-temple": {
    name: "Fire Temple", theme: "mountains", element: "fire", floors: 2,
    quests: {
      monsters: [["hangry-hob", 1, "daily am"], ["snack-snatcher", 2, "daily"], ["simmer-salamander", 2, "weekly"], ["cardboard-golem", 2, "weekly"]],
      minibosses: [["grime-griffin", 5, "weekly"]],
      boss: ["junkpile-jotun", 13, "monthly"],
    },
    trap: ["fire", 5], puzzle: "fireSequence", shop: "FireResistPotion", relics: ["Flame Shield"],
  },
  "ice-temple": {
    name: "Ice Temple", theme: "ice", element: "ice", floors: 2,
    quests: {
      monsters: [["hamper-hound", 1, "daily bed"], ["socktopus", 2, "weekly"], ["wrinkle-wyvern", 2, "weekly"]],
      minibosses: [["leftover-lich", 5, "weekly"]],
      boss: ["laundry-lurker", 13, "weekly"],
    },
    trap: ["iceSpikes", 6], puzzle: "mirrorIce", shop: "FrostResistPotion", relics: ["Frost Wand"],
  },
  "light-temple": {
    name: "Light Temple", theme: "desert", element: "light", floors: 2,
    quests: {
      monsters: [["paperwork-pixie", 1, "school"], ["backpack-boggart", 1, "school bed"], ["bookwyrm", 2, "daily"], ["sum-sphinx", 2, "school"], ["desk-drake", 2, "weekly"]],
      minibosses: [["homework-hydra", 5, "school"]],
      boss: ["pop-quiz-poltergeist", 8, "weekly"],
    },
    trap: ["blindingFlash", 4], puzzle: "prismAlignment", shop: "LuminousOrb", relics: ["Dawnbreaker Bow"],
  },
  "water-temple": {
    name: "Water Temple", theme: "islands", element: "water", floors: 2,
    quests: {
      monsters: [["soggy-slug", 1, "daily"], ["bare-roll-imp", 1, "daily"], ["toothpaste-serpent", 2, "daily bed"], ["puddle-phantom", 2, "daily"], ["smudge-specter", 2, "weekly"]],
      minibosses: [["drain-drake", 5, "weekly"]],
      boss: ["potty-poltergeist", 8, "weekly"],
    },
    trap: ["whirlpool", 5], puzzle: "waterLevels", shop: "WaterBreathingPotion", relics: ["Trident of Tides"],
  },
  "moon-temple": {
    name: "Moon Temple", theme: "moon", element: "moon", floors: 3,
    // The table lists the twos before the ones; the rule "easiest first" wins, the ones lead
    quests: {
      monsters: [["fang-fairy", 2, "daily am+night"], ["scroll-troll", 2, "daily bed"], ["snooze-sloth", 2, "daily am"], ["pajama-pooka", 1, "daily am"], ["grubgoblin", 1, "daily"], ["hairball-harpy", 1, "daily am"]],
      minibosses: [["stinkwisp", 5, "daily"]],
      boss: ["night-owlbear", 8, "daily bed"],
    },
    trap: ["moonquake", 5], puzzle: "generic", relics: ["Lunar Pendant", "Moon Shard"],
  },
  "shadow-temple": {
    name: "Shadow Temple", theme: "swamps", element: "shadow", floors: 3,
    quests: {
      monsters: [["plate-pixie", 1, "daily"], ["gravy-ghoul", 1, "daily"], ["mug-thug", 1, "daily"], ["crumb-gremlin", 1, "daily"], ["cupboard-kobold", 2, "daily am"], ["dish-goblin", 2, "daily"], ["garbage-gargoyle", 2, "weekly"]],
      minibosses: [["stickyfoot-slime", 5, "weekly"]],
      boss: ["grease-gorgon", 8, "weekly"],
    },
    trap: ["voidTrap", 8], puzzle: "shadowReflection", shop: "ShadowVeil", relics: ["Void Dagger"],
  },
};

/** The seed is the temple's id; the rest is what makes the layout short and kind: a handful of rooms a floor, one lock a floor pair. */
export const optionsFor = (id: string): GenerateOptions => {
  const plan = PLANS[id];
  return {
    id,
    name: plan.name,
    theme: plan.theme,
    element: plan.element,
    size: "small",
    floors: plan.floors,
    locks: plan.floors === 3 ? 2 : 1,
    roomsPerFloor: plan.floors === 3 ? 8 : 9,
    bossKeyChest: true,
    masterRoom: true,
  };
};

/**
 * The monster rooms of a layout in order of path distance from the entrance (every door counted as open, locks and
 * stairs included), nearest first. A room the walk cannot reach comes last, in the generator's own order.
 */
const monsterTokensByDistance = (temple: GeneratedTemple): string[] => {
  const graph = buildTempleGraph(temple);
  const reached = reachableFrom(graph, graph.entrance ?? "");
  const order = [...reached, ...graph.rooms.keys()];
  const tokens = [...new Set(order)].map((key) => graph.rooms.get(key)!).filter((room) => room.kind === "monster").map((room) => room.token);
  const hasSharedToken = new Set(tokens).size !== tokens.length;
  if (hasSharedToken) throw new Error(`${temple.id}: a monster token is shared by several rooms`);
  return tokens;
};

/** The quest templates the temple's monster rooms get, easiest first (a stable sort keeps the plan's order among equals). */
const monsterTemplates = (quests: PlanQuests): RoomQuestTemplate[] => [...quests.monsters].sort((a, b) => a[1] - b[1]).map(templateFor);

/** A combat room's content without the old beast and pay (`monsterType`, xp, gp, ap), and with its quest template. */
const asQuestRoom = (content: RoomContent, quest: RoomQuestTemplate): RoomContent => {
  const dressed: RoomContent = { ...content, quest };
  for (const loose of ["monsterType", "xp", "gp", "ap"]) delete dressed[loose];
  return dressed;
};

/** The generated layout in the temple's own flavour. Mutates `temple`, which is fresh from the generator. */
const dress = (temple: GeneratedTemple, plan: Plan): GeneratedTemple => {
  const rooms = Object.values(temple.rooms);
  const byType = (type: string) => rooms.filter((room) => room.type === type);

  const monsters = monsterTokensByDistance(temple);
  const templates = monsterTemplates(plan.quests);
  const counts = [
    { what: "monster rooms", found: monsters.length, listed: templates.length },
    { what: "miniboss rooms", found: byType("miniboss").length, listed: plan.quests.minibosses.length },
    { what: "boss rooms", found: byType("boss").length, listed: 1 },
  ];
  const mismatch = counts.find((count) => count.found !== count.listed);
  if (mismatch) throw new Error(`${temple.id}: ${mismatch.found} ${mismatch.what} for ${mismatch.listed} quests`);

  monsters.forEach((token, index) => {
    const room = temple.rooms[token];
    room.content = asQuestRoom(room.content ?? {}, templates[index]);
  });
  byType("miniboss").forEach((room, index) => {
    room.content = asQuestRoom(room.content ?? {}, templateFor(plan.quests.minibosses[index]));
  });
  for (const room of byType("boss")) room.content = asQuestRoom(room.content ?? {}, templateFor(plan.quests.boss));

  for (const room of rooms) {
    const content = room.content ?? {};
    const isTrap = room.type === "trap";
    if (isTrap) Object.assign(content, { trapType: plan.trap[0], damage: plan.trap[1] });
    const isPuzzle = room.type === "puzzle";
    if (isPuzzle) content.puzzleType = plan.puzzle;
    const isStockedShop = room.type === "shop" && !!plan.shop;
    if (isStockedShop) content.specialItem = plan.shop;
    const hasContent = Object.keys(content).length > 0;
    if (hasContent) room.content = content;
  }
  const potions = rooms.filter((room) => room.type === "loot" && room.content?.chest === "consumable");
  const isShortOfPotions = potions.length < plan.relics.length;
  if (isShortOfPotions) throw new Error(`${temple.id}: ${potions.length} chests of potions for ${plan.relics.length} relics`);
  plan.relics.forEach((relic, index) => (potions[potions.length - 1 - index].content = { chest: "dungeon", dungeon: relic }));
  return temple;
};

// --- the module -------------------------------------------------------------------------------------------------

/** The header of a regenerated module: what made it (the seed and the options are enough to rebuild it) */
const shippedHeader = (id: string): string[] => [
  "// Generated by tools/temples/regenerate.ts: change the plan there and run it again instead of editing this file.",
  `// seed: ${JSON.stringify(id)}`,
  `// options: ${JSON.stringify(optionsFor(id))}`,
  "// Floors run bottom to top: stairs up lead to the next floor in this list, a pit drops to the one before.",
  '// "_" is a wall; each other token is one room. The Master Room holds the Pegasus chest and sits right behind the boss.',
];

/** The temple as a module in the shape wind-temple.ts has (renderModule), under the regenerated header. */
export const renderShippedModule = (id: string, temple: GeneratedTemple): string => renderModule(id, temple, shippedHeader(id));

/** The layout a plan makes: the generator's temple in the temple's flavour. */
export const generateShipped = (id: string): GeneratedTemple => dress(generateTemple(id, optionsFor(id)), PLANS[id]);

export const SHIPPED_IDS = Object.keys(PLANS);

const isRunDirectly = require.main === module;
if (isRunDirectly) {
  const folder = join(process.cwd(), "src/lib/engine/temples");
  for (const id of SHIPPED_IDS) {
    const temple = generateShipped(id);
    writeFileSync(join(folder, `${id}.ts`), renderShippedModule(id, temple));
    console.log(`${id}: ${Object.keys(temple.maze).length} floors, ${Object.keys(temple.rooms).length - 1} rooms`);
  }
}
