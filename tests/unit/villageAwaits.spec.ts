import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { villageLine } from "@/components/organisms/VillageAwaits/villageAwaits";

const claim = (userId: string, questName: string) => ({ userId, questName } as unknown as QuestLogEntry);
const nick = (id: string) => ({ kid: "Max", teen: "Zoe" })[id] ?? "A hero";

describe("villageLine", () => {
  it("is empty when nobody waits", () => {
    expect(villageLine([], nick)).toBe("");
  });

  it("names the hero who has waited longest", () => {
    expect(villageLine([claim("kid", "Dishes")], nick)).toBe('Max finished "Dishes".');
  });

  it("counts the others behind it", () => {
    const two = [claim("kid", "Dishes"), claim("teen", "Bins")];
    expect(villageLine(two, nick)).toBe('Max finished "Dishes". 1 more waits behind it.');
    expect(villageLine([...two, claim("kid", "Beds")], nick)).toBe('Max finished "Dishes". 2 more wait behind it.');
  });
});
