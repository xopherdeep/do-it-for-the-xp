import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import ApprovalClaimRow from "@/app/Admin/XpApprovals/components/ApprovalClaimRow.vue";
import ApprovalPurchaseRow from "@/app/Admin/XpApprovals/components/ApprovalPurchaseRow.vue";
import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { useSentVerdicts } from "@/app/Admin/XpApprovals/useSentVerdicts";

/** The verdicts this device sent to the devices holding their heroes, as the sync store keeps them */
const mockSync = reactive({ state: { verdictsSent: {} as Record<string, { approved: boolean; at: string }> } });
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

/** A purchase waiting on the Game Master, as the Accessories tab lists it */
const aPurchase = (over: Partial<PurchaseLogEntry> = {}): PurchaseLogEntry =>
  ({
    id: "buy-1",
    userId: "hero-1",
    itemName: "Picture Show Ticket",
    price: 90,
    status: "pending",
    createdAt: "2026-10-17T18:00:00.000Z",
    ...over,
  }) as PurchaseLogEntry;

const mountRow = (entry: PurchaseLogEntry = aPurchase()) =>
  mount(ApprovalPurchaseRow, { props: { entry, heroName: "Mia", avatar: "", boughtOn: "Oct 17, 6:00PM" } });

describe("the Accessories tab's purchase card", () => {
  it("shows what was bought, by whom, and what it cost", () => {
    const wrapper = mountRow();
    expect(wrapper.text()).toContain("Picture Show Ticket");
    expect(wrapper.text()).toContain("Mia");
    expect(wrapper.text()).toContain("Oct 17, 6:00PM");
    expect(wrapper.text()).toContain("Paid 90 GP");
  });

  it("says a game item goes in the bag, and a real one waits to be delivered", () => {
    const heldItem = { name: "Wooden Sword", type: "weapon", faIcon: "sword", qty: 1 };
    expect(mountRow(aPurchase({ packed: heldItem })).text()).toContain("goes in their bag");
    expect(mountRow(aPurchase()).text()).toContain("waiting to be delivered");
  });

  it("has a Fulfil and a Refund button, labelled for the item and the hero", () => {
    const wrapper = mountRow();
    const fulfil = wrapper.get('[data-test="purchase-fulfil"]');
    const refund = wrapper.get('[data-test="purchase-refund"]');
    expect(fulfil.text()).toContain("Fulfil");
    expect(refund.text()).toContain("Refund");
    expect(fulfil.attributes("aria-label")).toBe("Fulfil Picture Show Ticket for Mia");
    expect(refund.attributes("aria-label")).toBe("Refund Picture Show Ticket to Mia");
  });

  it("looks like the quest card's buttons: the same claim button classes", () => {
    const wrapper = mountRow();
    expect(wrapper.get('[data-test="purchase-fulfil"]').classes()).toEqual(expect.arrayContaining(["claim__btn", "claim__btn--approve"]));
    expect(wrapper.get('[data-test="purchase-refund"]').classes()).toEqual(expect.arrayContaining(["claim__btn", "claim__btn--back"]));
  });

  it("tapping Fulfil asks for fulfil with the entry; tapping Refund asks for refund with the entry", async () => {
    const entry = aPurchase();
    const wrapper = mountRow(entry);
    await wrapper.get('[data-test="purchase-fulfil"]').trigger("click");
    expect(wrapper.emitted("fulfil")).toEqual([[entry]]);
    expect(wrapper.emitted("refund")).toBeUndefined();
    await wrapper.get('[data-test="purchase-refund"]').trigger("click");
    expect(wrapper.emitted("refund")).toEqual([[entry]]);
  });

  it("keeps the swipe options, and they ask for the same two things", async () => {
    const entry = aPurchase();
    const wrapper = mountRow(entry);
    const options = wrapper.findAll("ion-item-option");
    expect(options.map((option) => option.text())).toEqual(["Fulfil", "Refund"]);
    await options[0].trigger("click");
    await options[1].trigger("click");
    expect(wrapper.emitted("fulfil")).toEqual([[entry]]);
    expect(wrapper.emitted("refund")).toEqual([[entry]]);
  });
});

describe("the Achievements tab's claim card", () => {
  const aClaim = (): QuestLogEntry =>
    ({
      id: "entry-1",
      questId: "q-dishes",
      questName: "Dishes",
      userId: "hero-1",
      status: "pending",
      source: "claim",
      rewards: { xp: 30, gp: 40, ap: 2 },
      completedAt: "2026-10-22T09:00:00.000Z",
    }) as QuestLogEntry;
  const mountClaim = (sentLine?: string) =>
    mount(ApprovalClaimRow, { props: { entry: aClaim(), heroName: "Mia", avatar: "", ...(sentLine ? { sentLine } : {}) } });

  it("asks for a verdict with Approve and Send back, on the card and on the swipe", () => {
    const wrapper = mountClaim();
    expect(wrapper.find('[data-test="claim-approve"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="claim-send-back"]').exists()).toBe(true);
    expect(wrapper.findAll("ion-item-option")).toHaveLength(2);
    expect(wrapper.find('[data-test="claim-sent"]').exists()).toBe(false);
  });

  it("a verdict sent to the hero's device says so, and asks nothing more", () => {
    const wrapper = mountClaim("Approved · paying on Mia's device");
    expect(wrapper.get('[data-test="claim-sent"]').text()).toBe("Approved · paying on Mia's device");
    expect(wrapper.find('[data-test="claim-approve"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="claim-send-back"]').exists()).toBe(false);
    expect(wrapper.findAll("ion-item-option")).toHaveLength(0);
  });
});

describe("the line of a verdict sent to the hero's device", () => {
  const entry = (id: string) => ({ id, userId: "hero-1", status: "pending" }) as QuestLogEntry;

  it("reads sync.verdictSent for an approval, sync.verdictRejectedSent for a rejection, nothing while it waits here", () => {
    mockSync.state.verdictsSent = {
      "entry-1": { approved: true, at: "2026-10-22T10:00:00.000Z" },
      "entry-2": { approved: false, at: "2026-10-22T10:00:00.000Z" },
    };
    const sentLine = useSentVerdicts(() => undefined);
    expect(sentLine(entry("entry-1"), "Mia")).toBe("Approved · paying on Mia's device");
    expect(sentLine(entry("entry-2"), "Mia")).toBe("Not this time · sent");
    expect(sentLine(entry("entry-3"), "Mia")).toBe("");
  });

  it("a verdict applied (it leaves verdictsSent) has the screen read its claims again; a new one does not", async () => {
    mockSync.state.verdictsSent = { "entry-1": { approved: true, at: "2026-10-22T10:00:00.000Z" } };
    const landed = jest.fn();
    useSentVerdicts(landed);

    mockSync.state.verdictsSent = { ...mockSync.state.verdictsSent, "entry-2": { approved: false, at: "2026-10-22T10:01:00.000Z" } };
    await nextTick();
    expect(landed).not.toHaveBeenCalled();

    mockSync.state.verdictsSent = { "entry-2": { approved: false, at: "2026-10-22T10:01:00.000Z" } };
    await nextTick();
    expect(landed).toHaveBeenCalledTimes(1);
  });
});
