import { choreGains, CHORE_MP_SHARE, MOONLIGHT_HP_SHARE } from "@/lib/services/battle/choreGains";

describe("choreGains: what a finished chore gives back in a quest fight", () => {
  it("publishes the two shares", () => {
    expect(CHORE_MP_SHARE).toBe(0.1);
    expect(MOONLIGHT_HP_SHARE).toBe(0.05);
  });

  it("gives 10% max MP back for a chore in a quest fight", () => {
    expect(choreGains({ maxHp: 40, maxMp: 42, questFight: true, charged: false, moonlit: false })).toEqual({ hp: 0, mp: 4 });
  });

  it("never less than 1 MP, doubled by charge", () => {
    expect(choreGains({ maxHp: 40, maxMp: 10, questFight: true, charged: true, moonlit: false }).mp).toBe(2);
    expect(choreGains({ maxHp: 40, maxMp: 3, questFight: true, charged: false, moonlit: false }).mp).toBe(1);
  });

  it("heals 5% max HP per chore under moonlight", () => {
    expect(choreGains({ maxHp: 60, maxMp: 20, questFight: true, charged: false, moonlit: true }).hp).toBe(3);
  });

  it("gives nothing in a free fight", () => {
    expect(choreGains({ maxHp: 60, maxMp: 20, questFight: false, charged: true, moonlit: true })).toEqual({ hp: 0, mp: 0 });
  });

  it("gives no MP to a hero without an MP pool", () => {
    expect(choreGains({ maxHp: 60, maxMp: 0, questFight: true, charged: false, moonlit: false }).mp).toBe(0);
  });
});
