/**
 * Writes the eight generated temples of src/lib/engine/temples (earth, fire, ice, light, moon, shadow, storm, water)
 * from fixed seeds. The Wind Temple is made by hand and is never touched.
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
 * The generator lays out the rooms; this file dresses them in the temple's own flavour (its beasts, trap, riddle, shop
 * and relic) so a hero still meets the Rock Golems of the Earth Temple and finds Gaia's Hammer in a chest.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { generateTemple, type GenerateOptions, type GeneratedTemple } from "@/lib/engine/dungeons/generator/templeGenerator";

interface Plan {
  /** "Earth Temple": the name the Temple Creator lists the temple under */
  name: string;
  /** The world the temple stands in (the registry's `world`) */
  theme: string;
  element: string;
  floors: 2 | 3;
  /** Beasts by the names the bestiary matches: a boss, a mini-boss and the rest. Absent: the element's own pick */
  boss?: string;
  miniboss?: string;
  monster?: string;
  trap: [string, number];
  /** A riddle of RoomInteractions (`generic` when the temple has none of its own) */
  puzzle: string;
  shop?: string;
  /** Relics that replace the last chests of potions, so exploring pays */
  relics: string[];
}

const PLANS: Record<string, Plan> = {
  "earth-temple": { name: "Earth Temple", theme: "forest", element: "earth", floors: 2, boss: "Titan", miniboss: "StoneGuardian", monster: "RockGolem", trap: ["rockfall", 7], puzzle: "stonePillars", shop: "EarthquakeScroll", relics: ["Gaia's Hammer"] },
  "fire-temple": { name: "Fire Temple", theme: "mountains", element: "fire", floors: 2, boss: "Ifrit", miniboss: "FireElemental", monster: "FireImp", trap: ["fire", 5], puzzle: "fireSequence", shop: "FireResistPotion", relics: ["Flame Shield"] },
  "ice-temple": { name: "Ice Temple", theme: "ice", element: "ice", floors: 2, boss: "FrostGiant", miniboss: "IceWyrm", monster: "IceGolem", trap: ["iceSpikes", 6], puzzle: "mirrorIce", shop: "FrostResistPotion", relics: ["Frost Wand"] },
  "light-temple": { name: "Light Temple", theme: "desert", element: "light", floors: 2, boss: "Seraph", miniboss: "RadiantGuardian", monster: "LightSentinel", trap: ["blindingFlash", 4], puzzle: "prismAlignment", shop: "LuminousOrb", relics: ["Dawnbreaker Bow"] },
  "storm-temple": { name: "Storm Temple", theme: "clouds", element: "storm", floors: 2, trap: ["lightning", 6], puzzle: "generic", relics: ["Lightning Rod"] },
  "water-temple": { name: "Water Temple", theme: "islands", element: "water", floors: 2, boss: "Leviathan", miniboss: "GiantSquid", monster: "WaterElemental", trap: ["whirlpool", 5], puzzle: "waterLevels", shop: "WaterBreathingPotion", relics: ["Trident of Tides"] },
  "moon-temple": { name: "Moon Temple", theme: "moon", element: "moon", floors: 3, trap: ["moonquake", 5], puzzle: "generic", relics: ["Lunar Pendant", "Moon Shard"] },
  "shadow-temple": { name: "Shadow Temple", theme: "swamps", element: "shadow", floors: 3, boss: "Shadowlord", miniboss: "DarkPhantom", monster: "ShadowStalker", trap: ["voidTrap", 8], puzzle: "shadowReflection", shop: "ShadowVeil", relics: ["Void Dagger"] },
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

/** The generated layout in the temple's own flavour. Mutates `temple`, which is fresh from the generator. */
const dress = (temple: GeneratedTemple, plan: Plan): GeneratedTemple => {
  const rooms = Object.values(temple.rooms);
  for (const room of rooms) {
    const content = room.content ?? {};
    if (room.type === "boss" && plan.boss) content.monsterType = plan.boss;
    if (room.type === "miniboss" && plan.miniboss) content.monsterType = plan.miniboss;
    if (room.type === "monster") content.monsterType = plan.monster ?? "small";
    if (room.type === "trap") Object.assign(content, { trapType: plan.trap[0], damage: plan.trap[1] });
    if (room.type === "puzzle") content.puzzleType = plan.puzzle;
    if (room.type === "shop" && plan.shop) content.specialItem = plan.shop;
    if (Object.keys(content).length) room.content = content;
  }
  const potions = rooms.filter((room) => room.type === "loot" && room.content?.chest === "consumable");
  if (potions.length < plan.relics.length) throw new Error(`${temple.id}: ${potions.length} chests of potions for ${plan.relics.length} relics`);
  plan.relics.forEach((relic, index) => (potions[potions.length - 1 - index].content = { chest: "dungeon", dungeon: relic }));
  return temple;
};

// --- the module -------------------------------------------------------------------------------------------------

const KEY = /^[A-Za-z_$][\w$]*$/;

/** A JS literal on one line, keys bare where they can be. */
const literal = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${KEY.test(key) ? key : JSON.stringify(key)}: ${literal(item)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value);
};

const camel = (id: string): string => id.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());

/** The temple as a module in the shape wind-temple.ts has: id, name, entrance, floors of tokens, the rooms table. */
export const renderModule = (id: string, temple: GeneratedTemple): string => {
  const options = optionsFor(id);
  const width = Math.max(...Object.values(temple.maze).flat(2).map((token) => token.length)) + 3;
  const floors = Object.entries(temple.maze).map(([floor, grid]) => {
    const rows = grid.map((row) => `      [${row.map((token, col) => (col < row.length - 1 ? `${JSON.stringify(token)},` : JSON.stringify(token)).padEnd(width)).join(" ").trimEnd()}],`);
    return `    "${floor}": [\n${rows.join("\n")}\n    ],`;
  });
  const rooms = Object.entries(temple.rooms).map(([token, room]) => `    ${JSON.stringify(token)}: ${literal(room)},`);
  return `// Generated by tools/temples/regenerate.ts: change the plan there and run it again instead of editing this file.
// seed: ${JSON.stringify(id)}
// options: ${JSON.stringify(options)}
// Floors run bottom to top: stairs up lead to the next floor in this list, a pit drops to the one before.
// "_" is a wall; each other token is one room. The Master Room holds the Pegasus chest and sits right behind the boss.
const ${camel(id)} = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(temple.name)},
  entrance: ${literal(temple.entrance)}, // [Floor Index (0 is the first floor in the list), row, column]
  maze: {
${floors.join("\n")}
  },
  rooms: {
${rooms.join("\n")}
  },
};

export default ${camel(id)};
`;
};

/** The layout a plan makes: the generator's temple in the temple's flavour. */
export const generateShipped = (id: string): GeneratedTemple => dress(generateTemple(id, optionsFor(id)), PLANS[id]);

export const SHIPPED_IDS = Object.keys(PLANS);

if (require.main === module) {
  const folder = join(process.cwd(), "src/lib/engine/temples");
  for (const id of SHIPPED_IDS) {
    const temple = generateShipped(id);
    writeFileSync(join(folder, `${id}.ts`), renderModule(id, temple));
    console.log(`${id}: ${Object.keys(temple.maze).length} floors, ${Object.keys(temple.rooms).length - 1} rooms`);
  }
}
