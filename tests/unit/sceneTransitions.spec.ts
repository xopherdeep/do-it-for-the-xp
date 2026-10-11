import { sceneOf, transitionFor, type Scene } from "@/lib/services/transitions/sceneTransitions";

const at = (name: string, params: Record<string, unknown> = {}) => sceneOf({ name, params });

describe("sceneOf", () => {
  it.each([
    ["shop", "building", "Item Shop"],
    ["bank", "building", "Gold Bank"],
    ["hospital", "building", "Hospital"],
    ["town-hall", "building", "Town Hall"],
    ["hotel", "building", "Hotel"],
    ["my-home", "building", "My Home"],
    ["home-town", "town", "Home Town"],
    ["world-map", "world-map", "World Map"],
    ["world-plains", "region", "The Plains"],
    ["the-moon", "region", "The Moon"],
    ["battle-quest", "battle", undefined],
    ["battle-temple", "battle", undefined],
    ["battle-now", "battle", undefined],
    ["battle-free", "battle", undefined],
    ["my-party", "portal", undefined],
    ["my-profile", "portal", undefined],
    ["game-master", "other", undefined],
  ])("%s is %s", (name, kind, title) => {
    const scene = at(name);
    expect(scene.kind).toBe(kind);
    expect(scene.title).toBe(title);
  });

  it("treats every region route as a region", () => {
    ["forest", "islands", "swamps", "mountains", "sands", "ice", "clouds"].forEach((id) =>
      expect(at(`world-${id}`).kind).toBe("region")
    );
  });

  it("makes a building's sub-pages the same scene", () => {
    expect(at("cook-food").key).toBe(at("my-home").key);
    expect(at("storage").key).toBe(at("my-home").key);
    expect(at("view-stats").key).toBe(at("hospital").key);
  });

  it("keys a temple by its id and reads title and element from the registry", () => {
    const scene = at("temple", { temple: "wind-temple" });
    expect(scene).toMatchObject({ kind: "temple", key: "temple:wind-temple", title: "The Howling Spire", element: "wind" });
  });

  it("names an unknown temple from its slug", () => {
    expect(at("temple", { temple: "gen-ember-hall" }).title).toBe("Ember Hall");
  });

  it("falls back to other for a missing or symbol name", () => {
    expect(sceneOf({ params: {}, path: "/x" }).kind).toBe("other");
    expect(sceneOf({ name: Symbol("s"), params: {} }).kind).toBe("other");
  });
});

describe("transitionFor", () => {
  const town = at("home-town");
  const map = at("world-map");
  const plains = at("world-plains");
  const forest = at("world-forest");
  const shop = at("shop");
  const wind = at("temple", { temple: "wind-temple" });
  const battle = at("battle-quest");
  const portal = at("my-party");
  const other = at("game-master");

  it("is null for the same scene", () => {
    expect(transitionFor(shop, at("shop", { merchant: "x" }))).toBeNull();
    expect(transitionFor(wind, wind)).toBeNull();
    expect(transitionFor(at("my-home"), at("storage"))).toBeNull();
    expect(transitionFor(battle, at("battle-free"))).toBeNull();
  });

  it("opens doors into a building and back out", () => {
    expect(transitionFor(town, shop)).toMatchObject({ effect: "doors", direction: "in", title: "Item Shop" });
    expect(transitionFor(portal, shop)?.effect).toBe("doors");
    expect(transitionFor(shop, town)).toMatchObject({ effect: "doors", direction: "out", title: "Home Town" });
    expect(transitionFor(shop, other)).toBeNull();
  });

  it("irises into a temple with its name, region and element", () => {
    expect(transitionFor(plains, wind)).toMatchObject({
      effect: "iris",
      direction: "in",
      title: "The Howling Spire",
      subtitle: "The Plains",
      element: "wind",
    });
  });

  it("irises out of a temple to the destination region", () => {
    expect(transitionFor(wind, plains)).toMatchObject({ effect: "iris", direction: "out", title: "The Plains" });
    expect(transitionFor(wind, other)).toBeNull();
  });

  it("swirls into a battle, from anywhere", () => {
    [town, plains, wind, shop, other].forEach((from) => expect(transitionFor(from, battle)).toMatchObject({ effect: "swirl", direction: "in" }));
    expect(transitionFor(wind, battle)?.title).toBeUndefined();
  });

  it("fades out of a battle back to a temple or region", () => {
    expect(transitionFor(battle, wind)).toMatchObject({ effect: "fade", direction: "out" });
    expect(transitionFor(battle, plains)?.effect).toBe("fade");
    expect(transitionFor(battle, portal)).toBeNull();
  });

  it("rides the clouds between town, world map and regions", () => {
    expect(transitionFor(map, plains)).toMatchObject({ effect: "clouds", title: "The Plains", subtitle: "Plains of Ventus" });
    expect(transitionFor(plains, map)).toMatchObject({ effect: "clouds", title: "World Map" });
    expect(transitionFor(town, plains)?.effect).toBe("clouds");
    expect(transitionFor(town, map)?.effect).toBe("clouds");
    expect(transitionFor(map, town)?.effect).toBe("clouds");
  });

  it("flies by Pegasus from region to region", () => {
    expect(transitionFor(plains, forest)).toMatchObject({ effect: "clouds", variant: "pegasus", title: "The Forest" });
    expect(transitionFor(map, forest)?.variant).toBeUndefined();
  });

  it("leaves portal and other pages to Ionic", () => {
    expect(transitionFor(portal, town)).toBeNull();
    expect(transitionFor(town, portal)).toBeNull();
    expect(transitionFor(other, plains)).toBeNull();
    expect(transitionFor(plains, other)).toBeNull();
    expect(transitionFor(portal, other as Scene)).toBeNull();
  });
});
