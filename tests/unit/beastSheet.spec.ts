import type { Beast } from "@/lib/databases/BestiaryDb";
import type { ProposalState } from "@/lib/services/creations/creations";
import { beastSheetButtons } from "@/app/Admin/XpCompendium/views/XpBestiary/beastSheet";
import type { BeastSheetHandlers } from "@/app/Admin/XpCompendium/views/XpBestiary/beastSheet";

/** The menu on a beast's card in the Bestiary (beastSheet.ts): what a beast in play offers, and what a kid's waiting one does */

const beast = (state?: ProposalState): Beast => ({
  id: "b1",
  name: "Sock Monster",
  checklist: [],
  ...(state ? { madeBy: "ronan", proposal: { by: "ronan", on: "2026-10-27T10:00:00.000Z", state } } : {}),
});

const handlers = (): BeastSheetHandlers => ({
  edit: jest.fn(),
  tasks: jest.fn(),
  attach: jest.fn(),
  approve: jest.fn(),
  sendBack: jest.fn(),
  remove: jest.fn(),
});

const textsOf = (beastToList: Beast) => beastSheetButtons(beastToList, handlers()).map((button) => button.text);

describe("beastSheetButtons", () => {
  it("offers Attach to Quests on a beast in play: the Game Master's own, and a kid's once approved", () => {
    const expected = ["Edit Beast", "View Task List", "Attach to Quests", "Delete Beast", "Cancel"];
    expect(textsOf(beast())).toEqual(expected);
    expect(textsOf(beast("approved"))).toEqual(expected);
  });

  it("offers Approve and Send back instead on a kid's beast that is not in the game yet", () => {
    const expected = ["Edit Beast", "View Task List", "Approve", "Send back", "Delete Beast", "Cancel"];
    expect(textsOf(beast("proposed"))).toEqual(expected);
    expect(textsOf(beast("returned"))).toEqual(expected);
  });

  it("wires each line to the page's handler, Delete as destructive and Cancel as the way out", () => {
    const on = handlers();
    const buttons = beastSheetButtons(beast("proposed"), on);
    buttons.find((button) => button.text === "Approve")?.handler?.();
    buttons.find((button) => button.text === "Send back")?.handler?.();
    buttons.find((button) => button.text === "Delete Beast")?.handler?.();
    expect(on.approve).toHaveBeenCalledTimes(1);
    expect(on.sendBack).toHaveBeenCalledTimes(1);
    expect(on.remove).toHaveBeenCalledTimes(1);
    expect(on.attach).not.toHaveBeenCalled();
    expect(buttons.find((button) => button.text === "Delete Beast")?.role).toBe("destructive");
    expect(buttons.find((button) => button.text === "Cancel")?.role).toBe("cancel");
  });
});
