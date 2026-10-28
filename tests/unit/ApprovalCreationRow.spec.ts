import { mount } from "@vue/test-utils";
import ApprovalCreationRow from "@/app/Admin/XpApprovals/components/ApprovalCreationRow.vue";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { creationRows } from "@/lib/services/creations/creations";
import type { CreationRow, Proposal } from "@/lib/services/creations/creations";

/**
 * One kid's creation waiting on the Game Master, as the Creations tab lists it: the beast or the quest, who made it,
 * what it is, how long it has waited, and the three actions. The row only asks; XpApprovals runs the dialogs.
 */

const SENT = "2026-10-26T08:00:00.000Z";
const PORTRAIT = "data:image/webp;base64,AAAA";

const waiting = (by: string, patch: Partial<Proposal> = {}): Proposal => ({ by, on: SENT, state: "proposed", ...patch });

const drawnBeast = (patch: Partial<Beast> = {}): Beast => ({
  id: "b1",
  name: "Sock Monster",
  checklist: ["Find the pair", "Roll them", "Put them away"],
  localImage: PORTRAIT,
  madeBy: "ronan",
  proposal: waiting("ronan"),
  ...patch,
});

const dishQuest = (patch: Partial<Achievement> = {}): Achievement =>
  ({
    id: "q1",
    achievementName: "Do The Dishes",
    assignee: ["mia"],
    draft: true,
    difficulty: 2,
    timesOfDay: ["morning"],
    createdBy: "jack",
    proposal: waiting("jack"),
    ...patch,
  }) as Achievement;

const beastRow = () => creationRows([drawnBeast()], [])[0];
const questRow = () => creationRows([], [dishQuest()])[0];
const pairedRow = () => creationRows([drawnBeast({ proposal: waiting("ronan", { questId: "q1" }) })], [dishQuest()])[0];

interface RowProps {
  makerName: string;
  avatar: string;
  targetNames: string;
  portrait: string;
}

const mountRow = (row: CreationRow, over: Partial<RowProps> = {}) =>
  mount(ApprovalCreationRow, {
    props: { row, makerName: "Ronan", avatar: "", targetNames: "Mia", portrait: PORTRAIT, ...over },
  });

describe("the Creations tab's creation card", () => {
  it("shows a beast: its name, who drew it and how many chores beat it, its picture, and how long it has waited", () => {
    const wrapper = mountRow(beastRow());
    expect(wrapper.text()).toContain("Sock Monster");
    expect(wrapper.text()).toContain("Drawn by Ronan · 3 chores");
    expect(wrapper.get('[data-test="creation-portrait"]').attributes("src")).toBe(PORTRAIT);
    expect(wrapper.get('[data-test="creation-waited"]').text()).toContain("waited");
  });

  it("shows a quest: who suggested it, who it is for, its size and when it is done", () => {
    const wrapper = mountRow(questRow(), { makerName: "Jack", portrait: "" });
    expect(wrapper.text()).toContain("Do The Dishes");
    expect(wrapper.text()).toContain("Suggested by Jack · for Mia · size 2 · mornings");
    expect(wrapper.find('[data-test="creation-portrait"]').exists()).toBe(false);
  });

  it("says when a beast came with a quest, and who that quest is for", () => {
    expect(mountRow(pairedRow()).text()).toContain("+ a quest for Mia");
    expect(mountRow(beastRow()).text()).not.toContain("a quest for");
  });

  it("has Approve, Send back and Edit buttons, labelled for the creation and the maker", () => {
    const wrapper = mountRow(beastRow());
    const approve = wrapper.get('[data-test="creation-approve"]');
    const back = wrapper.get('[data-test="creation-send-back"]');
    const edit = wrapper.get('[data-test="creation-edit"]');
    expect(approve.text()).toContain("Approve");
    expect(back.text()).toContain("Send back");
    expect(edit.text()).toContain("Edit");
    expect(approve.attributes("aria-label")).toBe("Approve Sock Monster by Ronan");
    expect(back.attributes("aria-label")).toBe("Send Sock Monster back to Ronan");
    expect(edit.attributes("aria-label")).toBe("Edit Sock Monster");
  });

  it("looks like the quest card's buttons: the same claim button classes, Edit as a ghost", () => {
    const wrapper = mountRow(beastRow());
    expect(wrapper.get('[data-test="creation-approve"]').classes()).toEqual(expect.arrayContaining(["claim__btn", "claim__btn--approve"]));
    expect(wrapper.get('[data-test="creation-send-back"]').classes()).toEqual(expect.arrayContaining(["claim__btn", "claim__btn--back"]));
    expect(wrapper.get('[data-test="creation-edit"]').classes()).toEqual(expect.arrayContaining(["claim__btn", "claim__btn--ghost"]));
  });

  it("tapping a button asks for approve, reject or edit with the row", async () => {
    const row = beastRow();
    const wrapper = mountRow(row);
    await wrapper.get('[data-test="creation-approve"]').trigger("click");
    expect(wrapper.emitted("approve")).toEqual([[row]]);
    expect(wrapper.emitted("reject")).toBeUndefined();
    await wrapper.get('[data-test="creation-send-back"]').trigger("click");
    expect(wrapper.emitted("reject")).toEqual([[row]]);
    await wrapper.get('[data-test="creation-edit"]').trigger("click");
    expect(wrapper.emitted("edit")).toEqual([[row]]);
  });

  it("keeps the swipe options, Approve and Send back, and they ask for the same things", async () => {
    const row = questRow();
    const wrapper = mountRow(row, { makerName: "Jack", portrait: "" });
    const options = wrapper.findAll("ion-item-option");
    expect(options.map((option) => option.text())).toEqual(["Approve", "Send back"]);
    await options[0].trigger("click");
    await options[1].trigger("click");
    expect(wrapper.emitted("approve")).toEqual([[row]]);
    expect(wrapper.emitted("reject")).toEqual([[row]]);
  });
});
