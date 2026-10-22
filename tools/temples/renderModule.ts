/**
 * A temple layout as a module of src/lib/engine/temples, in the shape wind-temple.ts has: id, name, entrance, floors
 * of tokens, the rooms table. `regenerate.ts` writes the generator's temples through it and `classic/dress.ts` the
 * converted dungeons; each hands over its own header lines, so a module says what made it and from what.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";

/** The part of a temple the module shows: GeneratedTemple and a dressed classic dungeon both fit */
export interface RenderableTemple {
  name: string;
  /** `[floorIndex, row, col]` */
  entrance: number[];
  maze: string[][] | Record<string, string[][]>;
  rooms: Record<string, Room>;
}

const KEY = /^[A-Za-z_$][\w$]*$/;

/** A JS literal on one line, keys bare where they can be. */
export const literal = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  const isObject = !!value && typeof value === "object";
  if (isObject) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${KEY.test(key) ? key : JSON.stringify(key)}: ${literal(item)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value);
};

export const camel = (id: string): string => id.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());

/**
 * The temple as a module: `header` is the comment lines at the top (each already starting with "//"), then the
 * constant named after the id, with the floors in the order the temple lists them.
 */
export const renderModule = (id: string, temple: RenderableTemple, header: string[]): string => {
  const grids = Array.isArray(temple.maze) ? { "1F": temple.maze } : temple.maze;
  const width = Math.max(...Object.values(grids).flat(2).map((token) => token.length)) + 3;
  const floors = Object.entries(grids).map(([floor, grid]) => {
    const rows = grid.map((row) => `      [${row.map((token, col) => (col < row.length - 1 ? `${JSON.stringify(token)},` : JSON.stringify(token)).padEnd(width)).join(" ").trimEnd()}],`);
    return `    "${floor}": [\n${rows.join("\n")}\n    ],`;
  });
  const rooms = Object.entries(temple.rooms).map(([token, room]) => `    ${JSON.stringify(token)}: ${literal(room)},`);
  return `${header.join("\n")}
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
