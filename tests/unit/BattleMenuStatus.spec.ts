import { battleMenuStatus, shortReason } from "@/lib/services/battle/BattleMenuStatus";
import { REASON_HP_FULL, REASON_NO_MP, REASON_STRIKE_WAITING, REASON_USED } from "@/lib/services/battle/BattleEffects";
import { REASON_NO_BOMBS, REASON_NOT_HELD } from "@/lib/services/battle/BattleItems";
import { REASON_FULL_STRENGTH, REASON_MP_FULL } from "@/lib/services/battle/BattlePotions";

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

  it("Powers is disabled with the first reason, shortened, when nothing casts, and 'none' with no Powers", () => {
    expect(battleMenuStatus({ ...base, powers: [power(25, REASON_NO_MP), power(40, REASON_USED)] }).powers).toEqual({ enabled: false, note: "no MP" });
    expect(battleMenuStatus({ ...base, powers: [power(40, REASON_USED)] }).powers).toEqual({ enabled: false, note: "used" });
    expect(battleMenuStatus(base).powers).toEqual({ enabled: false, note: "none" });
  });

  it("shortReason maps the engine's sentences to the words a menu row holds", () => {
    expect(shortReason(REASON_NO_MP)).toBe("no MP");
    expect(shortReason(REASON_USED)).toBe("used");
    expect(shortReason(REASON_HP_FULL)).toBe("HP full");
    expect(shortReason(REASON_STRIKE_WAITING)).toBe("wait");
    expect(shortReason(REASON_NOT_HELD)).toBe("not held");
    expect(shortReason(REASON_NO_BOMBS)).toBe("no bombs");
    expect(shortReason(REASON_MP_FULL)).toBe("MP full");
    expect(shortReason(REASON_FULL_STRENGTH)).toBe("full");
  });

  it("shortReason falls back to the first word in lower case, cut to nine characters", () => {
    expect(shortReason("Locked until you free a Pegasus.")).toBe("locked");
    expect(shortReason("Extraordinarily unusable")).toBe("extraordi");
    expect(shortReason("Out of puff.")).toBe("out");
  });

  it("Goods counts usable effect tiles plus potion quantities", () => {
    expect(battleMenuStatus({ ...base, goods: [card(), card("spent"), { role: "none", card: null }], potions: [potion(2), potion(1, "full HP")] }).goods).toEqual({ enabled: true, note: "x3" });
  });

  it("a container tile (Bottles, Book of Spells) never counts, even with no reason", () => {
    expect(battleMenuStatus({ ...base, goods: [container()] }).goods).toEqual({ enabled: false, note: "empty" });
  });

  it("Goods names why from what the hero owns: a potion's reason first, even with tools out of hand", () => {
    expect(battleMenuStatus({ ...base, potions: [potion(2, REASON_HP_FULL)] }).goods).toEqual({ enabled: false, note: "HP full" });
    expect(battleMenuStatus({ ...base, potions: [potion(1, REASON_MP_FULL)] }).goods).toEqual({ enabled: false, note: "MP full" });
    expect(battleMenuStatus({ ...base, potions: [potion(1, REASON_FULL_STRENGTH)] }).goods).toEqual({ enabled: false, note: "full" });
    // Tools out of hand sit beside the potion, and the potion still speaks first
    expect(battleMenuStatus({ ...base, goods: [card(REASON_NOT_HELD)], potions: [potion(1, REASON_HP_FULL)] }).goods).toEqual({ enabled: false, note: "HP full" });
    // The first potion that has a reason speaks, whatever follows it
    expect(battleMenuStatus({ ...base, potions: [potion(1, REASON_MP_FULL), potion(1, REASON_HP_FULL)] }).goods).toEqual({ enabled: false, note: "MP full" });
  });

  it("Goods says 'no bombs' for a held Bombs tile with none in the pack", () => {
    expect(battleMenuStatus({ ...base, goods: [card(REASON_NO_BOMBS)] }).goods).toEqual({ enabled: false, note: "no bombs" });
  });

  it("Goods says 'not held' for tools out of hand when the hero has no potions", () => {
    expect(battleMenuStatus({ ...base, goods: [card(REASON_NOT_HELD), card(REASON_USED)] }).goods).toEqual({ enabled: false, note: "not held" });
    expect(battleMenuStatus({ ...base, goods: [container(), { role: "none", card: null }, card(REASON_USED)] }).goods).toEqual({ enabled: false, note: "used" });
  });

  it("Goods is 'empty' only when there are no effect tiles and no potions at all", () => {
    expect(battleMenuStatus(base).goods).toEqual({ enabled: false, note: "empty" });
    expect(battleMenuStatus({ ...base, goods: [{ role: "none", card: null }] }).goods).toEqual({ enabled: false, note: "empty" });
  });
});
