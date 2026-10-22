import { battleMenuStatus } from "@/lib/services/battle/BattleMenuStatus";

const power = (mp: number, reason: string | null = null) => ({ ability: { id: `p${mp}` } as never, card: { mp, effect: "", reason } });
const card = (reason: string | null = null, role = "effect" as const) => ({ role, card: { name: "Bomb", faIcon: "bomb", mp: 0, effect: "", reason } });
const container = () => ({ role: "potions" as const, card: { name: "Bottles", faIcon: "flask", mp: 0, effect: "Your potions", reason: null } });
const potion = (qty: number, reason: string | null = null) => ({ id: "hp", name: "Health Potion", qty, faIcon: "flask", effect: "", reason });
const base = { choresLeft: 3, powers: [], goods: [], potions: [] };

describe("battleMenuStatus", () => {
  it("Tackle counts the chores left and is always enabled", () => {
    expect(battleMenuStatus({ ...base, choresLeft: 3 }).tackle).toEqual({ enabled: true, note: "3 chores" });
    expect(battleMenuStatus({ ...base, choresLeft: 1 }).tackle).toEqual({ enabled: true, note: "1 chore" });
    expect(battleMenuStatus({ ...base, choresLeft: 0 }).tackle).toEqual({ enabled: true, note: "all done" });
  });

  it("Powers shows the cheapest castable cost, a free one included", () => {
    expect(battleMenuStatus({ ...base, powers: [power(40), power(25), power(10, "spent")] }).powers).toEqual({ enabled: true, note: "25 MP" });
    expect(battleMenuStatus({ ...base, powers: [power(0)] }).powers).toEqual({ enabled: true, note: "0 MP" });
  });

  it("Powers is disabled with the first reason when nothing casts, and 'none' with no Powers", () => {
    expect(battleMenuStatus({ ...base, powers: [power(25, "no MP"), power(40, "spent")] }).powers).toEqual({ enabled: false, note: "no MP" });
    expect(battleMenuStatus(base).powers).toEqual({ enabled: false, note: "none" });
  });

  it("Goods counts usable effect tiles plus potion quantities", () => {
    expect(battleMenuStatus({ ...base, goods: [card(), card("spent"), { role: "none", card: null }], potions: [potion(2), potion(1, "full HP")] }).goods).toEqual({ enabled: true, note: "x3" });
  });

  it("a container tile (Bottles, Book of Spells) never counts, even with no reason", () => {
    expect(battleMenuStatus({ ...base, goods: [container()] }).goods).toEqual({ enabled: false, note: "empty" });
  });

  it("Goods is 'empty' when nothing can be used", () => {
    expect(battleMenuStatus({ ...base, goods: [card("not held"), { role: "none", card: null }], potions: [potion(2, "full HP")] }).goods).toEqual({ enabled: false, note: "empty" });
    expect(battleMenuStatus(base).goods).toEqual({ enabled: false, note: "empty" });
  });
});
