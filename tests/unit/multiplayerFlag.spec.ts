import { multiplayerEnabled, MULTIPLAYER_OVERRIDE_KEY } from "@/lib/services/multiplayer/multiplayerFlag";

describe("multiplayerEnabled", () => {
  afterEach(() => localStorage.clear());

  it("is off by default and on with the build flag", () => {
    expect(multiplayerEnabled({ env: undefined, override: null, production: true })).toBe(false);
    expect(multiplayerEnabled({ env: "true", override: null, production: true })).toBe(true);
  });

  it("only the word true turns the build flag on", () => {
    expect(multiplayerEnabled({ env: "false", override: null, production: true })).toBe(false);
    expect(multiplayerEnabled({ env: "1", override: null, production: true })).toBe(false);
  });

  it("takes the override only in development", () => {
    expect(multiplayerEnabled({ env: undefined, override: "on", production: false })).toBe(true);
    expect(multiplayerEnabled({ env: undefined, override: "on", production: true })).toBe(false);
  });

  it("any other override value is off", () => {
    expect(multiplayerEnabled({ env: undefined, override: "off", production: false })).toBe(false);
    expect(multiplayerEnabled({ env: undefined, override: null, production: false })).toBe(false);
  });

  it("reads the override from localStorage when none is passed", () => {
    expect(MULTIPLAYER_OVERRIDE_KEY).toBe("xp:multiplayer");
    expect(multiplayerEnabled({ env: undefined, production: false })).toBe(false);
    localStorage.setItem(MULTIPLAYER_OVERRIDE_KEY, "on");
    expect(multiplayerEnabled({ env: undefined, production: false })).toBe(true);
  });

  it("survives a localStorage that throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(multiplayerEnabled({ env: undefined, production: false })).toBe(false);
    spy.mockRestore();
  });
});
