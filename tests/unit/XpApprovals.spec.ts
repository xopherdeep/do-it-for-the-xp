import { mount } from "@vue/test-utils";
import ApprovalPurchaseRow from "@/app/Admin/XpApprovals/components/ApprovalPurchaseRow.vue";
import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";

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
