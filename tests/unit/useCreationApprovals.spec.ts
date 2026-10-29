/**
 * The Creations lane's dialogs (useCreationApprovals.ts): the target chooser offers a checkbox per profile with the
 * kid's whole choice ticked, reads the ticked set back out of the alert, and hands it to the review as the assignee.
 * The alert, the router and the review service are faked; the hook's own wiring is what is checked.
 */
import { alertController } from "@ionic/vue";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { creationRows } from "@/lib/services/creations/creations";
import { approveRow } from "@/lib/services/creations/creationReview";
import { useCreationApprovals } from "@/app/Admin/XpApprovals/useCreationApprovals";
import type { CreationDeps } from "@/app/Admin/XpApprovals/useCreationApprovals";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("vue-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@ionic/vue", () => ({ alertController: { create: jest.fn() } }));
jest.mock("@/lib/services/creations/creationReview", () => ({
  __esModule: true,
  approveRow: jest.fn(),
  loadCreationRows: jest.fn(),
  returnRow: jest.fn(),
}));

const create = alertController.create as jest.Mock;
const approve = approveRow as jest.Mock;

type AlertOptions = {
  header?: string;
  inputs?: Array<{ value: string; checked?: boolean; type: string }>;
  buttons?: Array<{ text: string; handler?: () => void }>;
};

/** An alert that answers the chooser with `values` on Next (or backs out), then every later alert's confirm button is tapped */
const alertsAnswer = (chosen: { role: "confirm" | "cancel"; values?: string[] }) => {
  create.mockImplementation(async (options: AlertOptions) => ({
    present: jest.fn(),
    onDidDismiss: async () => ({ role: chosen.role, data: chosen.role === "confirm" ? { values: chosen.values } : undefined }),
    options,
  }));
};

const chooserOf = (): AlertOptions => create.mock.calls[0][0];

const dishQuest = (assignee: string[]): Achievement =>
  ({ id: "q1", achievementName: "Do The Dishes", assignee, draft: true, createdBy: "max", proposal: { by: "max", on: "2026-10-26T08:00:00.000Z", state: "proposed" } }) as Achievement;

const deps = (): CreationDeps => ({
  heroName: (id) => ({ max: "Max", pip: "Pip", dad: "Dad" })[id] ?? "",
  isKnownHero: (id) => ["max", "pip", "dad"].includes(id),
  profiles: () => [{ id: "max" }, { id: "pip" }, { id: "dad" }],
  reviewerId: () => "dad",
  // The review runs at once, so the assignee handed to approveRow can be read
  runReview: async (_entry, review) => {
    await review();
  },
});

/** Approve the row: the chooser (when the quest is for someone else), then the confirm alert's Approve button */
const approveFor = async (assignee: string[]) => {
  const [row] = creationRows([], [dishQuest(assignee)]);
  await useCreationApprovals(deps()).approveCreation(row);
  const confirm = create.mock.calls.map((call) => call[0] as AlertOptions).find((options) => options.header === "Approve Quest");
  confirm?.buttons?.find((button) => button.text === "Approve")?.handler?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  create.mockReset();
  approve.mockReset().mockResolvedValue({ ok: true, ap: 1 });
});

describe("the target chooser", () => {
  it("offers a checkbox per profile with the kid's whole choice ticked, and Next keeps it as sent", async () => {
    alertsAnswer({ role: "confirm", values: ["max", "pip"] });
    await approveFor(["max", "pip"]);

    const inputs = chooserOf().inputs ?? [];
    expect(inputs.map((input) => input.type)).toEqual(["checkbox", "checkbox", "checkbox"]);
    expect(inputs.filter((input) => input.checked).map((input) => input.value)).toEqual(["max", "pip"]);
    expect(approve).toHaveBeenCalledWith(expect.objectContaining({ key: "quest:q1" }), "dad", { assignee: ["max", "pip"] });
  });

  it("ticks the maker alone when the hero the kid chose is gone (a deleted profile)", async () => {
    alertsAnswer({ role: "confirm", values: ["max"] });
    await approveFor(["gone"]);

    const inputs = chooserOf().inputs ?? [];
    expect(inputs.filter((input) => input.checked).map((input) => input.value)).toEqual(["max"]);
    expect(approve).toHaveBeenCalledWith(expect.anything(), "dad", { assignee: ["max"] });
  });

  it("reads the Game Master's own ticks: Pip alone goes to Pip alone", async () => {
    alertsAnswer({ role: "confirm", values: ["pip"] });
    await approveFor(["max", "pip"]);
    expect(approve).toHaveBeenCalledWith(expect.anything(), "dad", { assignee: ["pip"] });
  });

  it("keeps the kid's choice when every box is unticked, rather than a quest for nobody", async () => {
    alertsAnswer({ role: "confirm", values: [] });
    await approveFor(["pip"]);
    expect(approve).toHaveBeenCalledWith(expect.anything(), "dad", { assignee: ["pip"] });
  });

  it("asks nothing for a quest the kid made for themself alone, and approves with their choice", async () => {
    alertsAnswer({ role: "confirm" });
    await approveFor(["max"]);
    expect(chooserOf().inputs).toBeUndefined();
    expect(approve).toHaveBeenCalledWith(expect.anything(), "dad", { assignee: undefined });
  });

  it("backs out with Cancel: no confirm, nothing approved", async () => {
    alertsAnswer({ role: "cancel" });
    await approveFor(["pip"]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(approve).not.toHaveBeenCalled();
  });
});
