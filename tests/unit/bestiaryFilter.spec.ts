import type { Beast } from "@/lib/databases/BestiaryDb";
import type { ProposalState } from "@/lib/services/creations/creations";
import { beastBadge, bestiaryFilter, emptyBestiaryLine } from "@/app/Admin/XpCompendium/views/XpBestiary/bestiaryFilter";

const proposalOf = (state: ProposalState) => ({ by: "ronan", on: "2026-10-27T10:00:00.000Z", state });

const beast = (id: string, name: string, extra: Partial<Beast> = {}): Beast => ({ id, name, checklist: [], ...extra });

const nickOf = (id: string) => ({ ronan: "Ronan" })[id as "ronan"] ?? "";

// The Game Master's own beast, an old one, and a kid's beast in each state of its proposal
const sockMonster = beast("gm", "Sock Monster");
const waiting = beast("waiting", "Sock Puppet", { madeBy: "ronan", proposal: proposalOf("proposed") });
const returned = beast("returned", "Dust Sock", { madeBy: "ronan", proposal: proposalOf("returned") });
const approved = beast("approved", "Lint Lord", { madeBy: "ronan", proposal: proposalOf("approved") });
const everyBeast = [sockMonster, waiting, returned, approved];

const idsOf = (beasts: Beast[]) => beasts.map(({ id }) => id);

describe("bestiaryFilter", () => {
  it("keeps a beast waiting for a Game Master out of the main list: All shows only beasts in play", () => {
    expect(idsOf(bestiaryFilter(everyBeast, "all", ""))).toEqual(["gm", "approved"]);
  });

  it("lists every kid beast under Creations, whatever state it is in, and leaves the Game Master's own out", () => {
    expect(idsOf(bestiaryFilter(everyBeast, "creations", ""))).toEqual(["waiting", "returned", "approved"]);
  });

  it("narrows both lists by name, ignoring case", () => {
    expect(idsOf(bestiaryFilter(everyBeast, "all", "SOCK"))).toEqual(["gm"]);
    expect(idsOf(bestiaryFilter(everyBeast, "creations", "sock"))).toEqual(["waiting", "returned"]);
    expect(bestiaryFilter(everyBeast, "creations", "no such beast")).toEqual([]);
  });

  it("hands back a new list and leaves the given one as it was", () => {
    const given = [...everyBeast];
    const shown = bestiaryFilter(given, "all", "");

    expect(shown).not.toBe(given);
    expect(given).toEqual(everyBeast);
  });

  it("steps over a hole in the list that storage handed back", () => {
    const withHole = [sockMonster, null as unknown as Beast, waiting];

    expect(idsOf(bestiaryFilter(withHole, "all", ""))).toEqual(["gm"]);
    expect(idsOf(bestiaryFilter(withHole, "creations", ""))).toEqual(["waiting"]);
  });

  it("shows an empty bestiary as empty under both segments", () => {
    expect(bestiaryFilter([], "all", "")).toEqual([]);
    expect(bestiaryFilter([], "creations", "")).toEqual([]);
  });
});

describe("emptyBestiaryLine", () => {
  it("says there are no creations yet under Creations and keeps the bestiary line under All", () => {
    expect(emptyBestiaryLine("creations")).toBe("No creations yet");
    expect(emptyBestiaryLine("all")).toBe("No beasts found in the bestiary...");
  });
});

describe("beastBadge", () => {
  it("says Waiting for a beast nobody has looked at and Came back for one sent back", () => {
    expect(beastBadge(waiting, nickOf)).toBe("Waiting");
    expect(beastBadge(returned, nickOf)).toBe("Came back");
  });

  it("credits the maker of an approved kid beast: Drawn by with their own picture, Made by with a library look", () => {
    const drawn = { ...approved, localImage: "data:image/jpeg;base64,AAAA" };

    expect(beastBadge(drawn, nickOf)).toBe("Drawn by Ronan");
    expect(beastBadge(approved, nickOf)).toBe("Made by Ronan");
  });

  it("says nothing for a Game Master's beast, or for a maker the family does not know", () => {
    expect(beastBadge(sockMonster, nickOf)).toBe("");
    expect(beastBadge({ ...approved, madeBy: "stranger", proposal: { ...proposalOf("approved"), by: "stranger" } }, nickOf)).toBe("");
  });
});
