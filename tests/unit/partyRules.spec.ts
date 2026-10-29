import { canJoin, defaultModeFor, synergyBuff, toHeroCard } from "@/lib/services/party/partyRules";
import { PRESETS, isPreset } from "@/lib/services/party/presets";

describe("partyRules", () => {
  describe("defaultModeFor", () => {
    it("starts kids on ask first and grown-ups open", () => {
      expect(defaultModeFor(false)).toBe("ask");
      expect(defaultModeFor(true)).toBe("open");
    });
  });

  describe("canJoin", () => {
    it("refuses a hero who stays home, whatever anyone approved", () => {
      expect(canJoin({ mode: "home", partyApproved: true, leaderAccepted: true })).toBe("refused");
    });

    it("keeps an ask-first hero waiting for the Game Master even after the leader accepts", () => {
      expect(canJoin({ mode: "ask", partyApproved: false, leaderAccepted: true })).toBe("needs-game-master");
      expect(canJoin({ mode: "ask", partyApproved: false, leaderAccepted: false })).toBe("needs-game-master");
    });

    it("lets an ask-first hero in once the Game Master approved the party and the leader accepted", () => {
      expect(canJoin({ mode: "ask", partyApproved: true, leaderAccepted: true })).toBe("join");
      expect(canJoin({ mode: "ask", partyApproved: true, leaderAccepted: false })).toBe("needs-leader");
    });

    it("lets an open hero in as soon as the leader accepts, with no Game Master step", () => {
      expect(canJoin({ mode: "open", partyApproved: false, leaderAccepted: true })).toBe("join");
      expect(canJoin({ mode: "open", partyApproved: false, leaderAccepted: false })).toBe("needs-leader");
    });
  });

  describe("toHeroCard", () => {
    const hero = {
      id: "h1",
      name: { full: "Pat Quinn Example", nick: "Mina" },
      email: "mina@example.com",
      pin: "1234",
      realName: "Pat",
      birthday: "2000-01-01",
      jobClass: "paladin",
      stats: { level: 7, xp: 900 },
      look: { skin: "peach", hair: "short", outfit: "paladin-1", secret: "x", leftHand: "fa-sword" },
    };

    it("keeps only the five public fields", () => {
      const card = toHeroCard(hero);
      expect(Object.keys(card).sort()).toEqual(["heroId", "jobClass", "level", "look", "nickname"]);
      expect(card).toMatchObject({ heroId: "h1", nickname: "Mina", level: 7, jobClass: "paladin" });
    });

    it("keeps only the look's known fields", () => {
      const card = toHeroCard(hero);
      expect(card.look).toEqual({ skin: "peach", hair: "short", outfit: "paladin-1", leftHand: "fa-sword" });
    });

    it("never falls back to a real name", () => {
      const card = toHeroCard({ id: "h2", name: { full: "Pat Quinn Example" } });
      expect(card.nickname).toBe("Hero");
    });

    it("trims and shortens a nickname", () => {
      expect(toHeroCard({ id: "h3", name: { nick: "  Sir Reginald the Third of Fairhaven  " } }).nickname).toBe(
        "Sir Reginald the Third o"
      );
    });

    it("gives a hero with no stats or look level 1 and no look", () => {
      const card = toHeroCard({ id: "h4" });
      expect(card).toMatchObject({ heroId: "h4", level: 1, jobClass: "", look: null });
    });
  });

  describe("synergyBuff", () => {
    it("grows with the heroes who finished chores today", () => {
      expect(synergyBuff([])).toBe(1);
      expect(synergyBuff(["a"])).toBe(1);
      expect(synergyBuff(["a", "b"])).toBe(1.1);
      expect(synergyBuff(["a", "b", "c"])).toBe(1.2);
      expect(synergyBuff(["a", "b", "c", "d", "e"])).toBe(1.2);
    });

    it("counts a hero who finished many chores once", () => {
      expect(synergyBuff(["a", "a", "a"])).toBe(1);
    });
  });
});

describe("presets", () => {
  it("offers a fixed list with unique ids and some words on each", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
    for (const preset of PRESETS) expect(preset.text.trim().length).toBeGreaterThan(0);
  });

  it("knows its own ids and nothing else", () => {
    expect(isPreset(PRESETS[0].id)).toBe(true);
    expect(isPreset("free text from a kid")).toBe(false);
    expect(isPreset("")).toBe(false);
    expect(isPreset("toString")).toBe(false);
    expect(isPreset("__proto__")).toBe(false);
  });

  it("includes the cheer and poke actions", () => {
    expect(isPreset("cheer")).toBe(true);
    expect(isPreset("poke")).toBe(true);
  });
});
