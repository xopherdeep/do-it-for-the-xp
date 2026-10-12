/**
 * Characterization of the shared monster configs the room editor offers (hooks/grid/monsterConfigs): the config
 * tokens a temple already uses or has set up, and the unused ones offered as new shared configs.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { listMonsterConfigs } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/monsterConfigs";

const MONSTER_TOKENS = ["M001", "M002", "M003", "M004", "M005", "M006", "M007", "M008", "M009"];
const MINIBOSS_TOKENS = ["MINI", "MIN1", "MIN2", "MIN3"];

describe("listMonsterConfigs", () => {
  it("offers the first three tokens as new shared configs for an empty temple", () => {
    expect(listMonsterConfigs(MONSTER_TOKENS, [], {})).toEqual([
      { token: "M001", name: "New shared config", hasBeasts: false, count: 0 },
      { token: "M002", name: "New shared config", hasBeasts: false, count: 0 },
      { token: "M003", name: "New shared config", hasBeasts: false, count: 0 },
    ]);
  });

  it("lists tokens the maze uses by how many rooms use them, then up to three unused tokens", () => {
    const maze = [
      ["M001", "M001", "R0001"],
      ["M003", "_", "M010"],
    ];
    expect(listMonsterConfigs(MONSTER_TOKENS, maze, {})).toEqual([
      { token: "M001", name: "2 rooms", hasBeasts: false, count: 2 },
      { token: "M003", name: "1 room", hasBeasts: false, count: 1 },
      { token: "M002", name: "New shared config", hasBeasts: false, count: 0 },
      { token: "M004", name: "New shared config", hasBeasts: false, count: 0 },
      { token: "M005", name: "New shared config", hasBeasts: false, count: 0 },
    ]);
  });

  it("names a configured token by its beasts, ahead of the rooms using it", () => {
    const maze = [["M001", "M001", "M001"]];
    const rooms: Record<string, Room> = {
      M001: { type: "monster", content: { beasts: ["b1"] } },
      M002: { type: "monster", content: { beasts: ["b1", "b2"] } },
    };
    const configs = listMonsterConfigs(MONSTER_TOKENS, maze, rooms);
    expect(configs[0]).toEqual({ token: "M001", name: "1 beast", hasBeasts: true, count: 3 });
    expect(configs[1]).toEqual({ token: "M002", name: "2 beasts", hasBeasts: true, count: 0 });
  });

  it("lists a token with a record but no beasts and no rooms as Empty", () => {
    const rooms: Record<string, Room> = { M002: { type: "monster" } };
    expect(listMonsterConfigs(MONSTER_TOKENS, [], rooms)[0]).toEqual({
      token: "M002",
      name: "Empty",
      hasBeasts: false,
      count: 0,
    });
  });

  it("counts tokens on every floor of a floor map", () => {
    const maze = { "1F": [["M001"]], "2F": [["M001", "M002"]] };
    const configs = listMonsterConfigs(MONSTER_TOKENS, maze, {});
    expect(configs.slice(0, 2)).toEqual([
      { token: "M001", name: "2 rooms", hasBeasts: false, count: 2 },
      { token: "M002", name: "1 room", hasBeasts: false, count: 1 },
    ]);
  });

  it("only considers the tokens in the token set it is given", () => {
    const maze = [["M001", "MINI", "MIN2"]];
    expect(listMonsterConfigs(MINIBOSS_TOKENS, maze, {})).toEqual([
      { token: "MINI", name: "1 room", hasBeasts: false, count: 1 },
      { token: "MIN2", name: "1 room", hasBeasts: false, count: 1 },
      { token: "MIN1", name: "New shared config", hasBeasts: false, count: 0 },
      { token: "MIN3", name: "New shared config", hasBeasts: false, count: 0 },
    ]);
  });

  it("offers no more than three unused tokens", () => {
    const configs = listMonsterConfigs(MONSTER_TOKENS, [], {});
    expect(configs.filter((c) => c.name === "New shared config")).toHaveLength(3);
  });
});
