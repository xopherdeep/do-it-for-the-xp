import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import XpInventoryModal from "../XpInventoryModal.vue";
import XpInventorySheet from "../XpInventorySheet.vue";
import { useUserStore } from "@/lib/store/stores/user";

describe("XpInventoryModal & XpInventorySheet", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const userStore = useUserStore();
    userStore.users["hero-1"] = {
      id: "hero-1",
      name: "Aura",
      inventory: [
        { name: "Health Potion", kind: "consumable", qty: 3, faIcon: "flask" },
        { name: "Old Key", kind: "key", qty: 1, faIcon: "key" },
      ],
      equipment: {
        leftHand: [],
        rightHand: [],
      },
    } as any;
    userStore.currentUser = userStore.users["hero-1"];
  });

  it("renders modal header with 'My Goods' and backpack icon", () => {
    const wrapper = mount(XpInventoryModal, {
      props: {
        isOpen: true,
        userId: "hero-1",
      },
      global: {
        stubs: {
          IonModal: { template: "<div class='ion-modal-stub'><slot /></div>" },
        },
      },
    });

    expect(wrapper.text()).toContain("My Goods");
  });

  it("emits close when close button is clicked", async () => {
    const wrapper = mount(XpInventoryModal, {
      props: {
        isOpen: true,
        userId: "hero-1",
      },
      global: {
        stubs: {
          IonModal: { template: "<div class='ion-modal-stub'><slot /></div>" },
        },
      },
    });

    const closeBtn = wrapper.findComponent({ name: "xp-close-button" });
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("renders inventory items and equipment in sheet", () => {
    const wrapper = mount(XpInventorySheet, {
      props: {
        userId: "hero-1",
        equipment: [
          { name: "Ice Wand", faIcon: "wand-magic ice", qty: 1, desc: "50MP | Freeze enemies" },
        ],
      },
    });

    expect(wrapper.text()).toContain("Health Potion");
    expect(wrapper.text()).toContain("Old Key");
    expect(wrapper.text()).toContain("Ice Wand");
  });

  it("evaluates battleCard and handles battle usage", async () => {
    const mockBattleCard = jest.fn((item: any) => {
      if (item.name === "Ice Wand") {
        return { name: "Ice Wand", faIcon: "wand-magic ice", mp: 50, effect: "+10 minutes", reason: null };
      }
      return { name: item.name, faIcon: "box", mp: 0, effect: "Can't use", reason: "Can't use that" };
    });

    const wrapper = mount(XpInventoryModal, {
      props: {
        isOpen: true,
        userId: "hero-1",
        mode: "battle",
        equipment: [
          { name: "Ice Wand", faIcon: "wand-magic ice", qty: 1 },
        ],
        battleCard: mockBattleCard,
      },
      global: {
        stubs: {
          IonModal: { template: "<div class='ion-modal-stub'><slot /></div>" },
        },
      },
    });

    expect(mockBattleCard).toHaveBeenCalled();
    expect(wrapper.text()).toContain("+10 minutes");
    expect(wrapper.text()).toContain("50 MP");

    // Click on Ice Wand row
    const rows = wrapper.findAll(".goods-row");
    const iceWandRow = rows.find((r) => r.text().includes("Ice Wand"));
    expect(iceWandRow).toBeDefined();

    await iceWandRow?.trigger("click");
    expect(wrapper.emitted("use-item")).toBeTruthy();
    expect(wrapper.emitted("use-item")?.[0][0]).toMatchObject({ name: "Ice Wand" });
  });

  it("allows potions and ethers to be used in battle via describeBattleItem and useBattleItem", async () => {
    const { describeBattleItem, useBattleItem } = await import("@/lib/services/battle/BattleItems");
    const userStore = useUserStore();
    userStore.users["hero-1"] = {
      id: "hero-1",
      name: "Aura",
      stats: {
        hp: { now: 20, max: 100 },
        mp: { now: 10, max: 100 },
      },
      inventory: [
        { name: "Health Potion", kind: "consumable", qty: 2 },
        { name: "Ether", kind: "consumable", qty: 1 },
      ],
      equipment: { leftHand: [], rightHand: [] },
    } as any;

    const ctx = {
      userId: "hero-1",
      usedThisFight: new Set(),
      service: {} as any,
    } as any;

    const hpCard = describeBattleItem({ name: "Health Potion" }, ctx);
    expect(hpCard).toMatchObject({
      name: "Health Potion",
      mp: 0,
      effect: "Restores 50 HP",
      reason: null,
    });

    const etherCard = describeBattleItem({ name: "Ether" }, ctx);
    expect(etherCard).toMatchObject({
      name: "Ether",
      mp: 0,
      effect: "Restores 50 MP",
      reason: null,
    });

    // Drink health potion directly
    const hpResult = useBattleItem({ name: "Health Potion" }, ctx);
    expect(hpResult.ok).toBe(true);
    expect(hpResult.line).toContain("You drink a Health Potion: +50 HP");
    expect(userStore.users["hero-1"].stats.hp.now).toBe(70);

    // Drink ether directly
    const etherResult = useBattleItem({ name: "Ether" }, ctx);
    expect(etherResult.ok).toBe(true);
    expect(etherResult.line).toContain("You drink an Ether: +50 MP");
    expect(userStore.users["hero-1"].stats.mp.now).toBe(60);
  });
});
