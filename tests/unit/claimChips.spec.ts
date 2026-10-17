import { claimChips } from "@/app/Admin/XpApprovals/components/claimChips";

describe("claimChips", () => {
  it("lists the rewards the hero earns", () => {
    expect(claimChips({ xp: 10, gp: 5, ap: 0 })).toEqual([
      { kind: "xp", value: 10 },
      { kind: "gp", value: 5 },
    ]);
  });

  it("adds a camera chip when the chore asked for a photo", () => {
    const chips = claimChips({ xp: 10, gp: 0, ap: 2 }, true);
    expect(chips[chips.length - 1]).toEqual({ kind: "tag", value: "Photo proof", icon: "fa-camera" });
  });

  it("has no camera chip otherwise", () => {
    expect(claimChips({ xp: 1, gp: 0, ap: 0 }, false)).toEqual([{ kind: "xp", value: 1 }]);
  });
});
