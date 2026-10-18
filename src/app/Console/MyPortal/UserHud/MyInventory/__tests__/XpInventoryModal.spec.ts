import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import XpInventoryModal from "../XpInventoryModal.vue";
import XpInventorySheet from "../XpInventorySheet.vue";
import { useUserStore } from "@/lib/store/stores/user";

// The toast the Store button shows when the storage is full: a spy, so the spec can read what was asked for
const mockToastCreate = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: (options: unknown) => mockToastCreate(options) },
}));

describe("XpInventoryModal & XpInventorySheet", () => {
  beforeEach(() => {
    mockToastCreate.mockReset();
    mockToastCreate.mockResolvedValue({ present: jest.fn() });
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

  describe("on the phone apps kit", () => {
    const mountSheet = (props: Record<string, unknown> = {}) =>
      mount(XpInventorySheet, { props: { userId: "hero-1", ...props } });

    it("groups the All tab into sections by kind, with the item name, a kind subtitle and the quantity", () => {
      const wrapper = mountSheet();

      const labels = wrapper.findAll(".xp-app-section__label").map((label) => label.text());
      expect(labels).toEqual(["Potions", "Keys"]);

      const potionRow = wrapper.find('.goods-row[data-kind="consumable"]');
      expect(potionRow.find(".xp-app-row__title").text()).toBe("Health Potion");
      expect(potionRow.find(".xp-app-row__subtitle").text()).toBe("Restores 50 HP");
      expect(potionRow.find(".goods-qty").text()).toBe("×3");

      const keyRow = wrapper.find('.goods-row[data-kind="key"]');
      expect(keyRow.find(".xp-app-row__subtitle").text()).toBe("Key");
      expect(keyRow.find(".goods-use-btn").exists()).toBe(false);
      expect(wrapper.find(".xp-app-row__chevron").exists()).toBe(false);
    });

    describe("drinking a potion outside a fight", () => {
      const hurt = (hp: number, mp = 100) => {
        (useUserStore().users["hero-1"] as any).stats = { hp: { now: hp, max: 100 }, mp: { now: mp, max: 100 } };
      };
      const potionRow = (wrapper: ReturnType<typeof mountSheet>) => wrapper.find('.goods-row[data-kind="consumable"]');

      it("heals with the Use button, spends one from the bag and says what it did", async () => {
        hurt(20);
        const wrapper = mountSheet();

        expect(potionRow(wrapper).find(".goods-use-btn").attributes("disabled")).toBeUndefined();
        await potionRow(wrapper).find(".goods-use-btn").trigger("click");

        const hero = useUserStore().users["hero-1"] as any;
        expect(hero.stats.hp.now).toBe(70);
        expect(hero.inventory.find((row: any) => row.name === "Health Potion").qty).toBe(2);
        expect(potionRow(wrapper).find(".goods-qty").text()).toBe("×2");
        expect(mockToastCreate).toHaveBeenCalledWith(
          expect.objectContaining({ cssClass: "rpg-toast", position: "middle", message: "You drink a Health Potion: +50 HP" })
        );
        expect(wrapper.emitted("select-item")).toBeUndefined();
      });

      it("restores MP with an Ether, also from a tap on the row", async () => {
        hurt(100, 10);
        useUserStore().users["hero-1"].inventory.push({ name: "Ether", kind: "consumable", qty: 1, faIcon: "sparkles" });
        const wrapper = mountSheet();

        const etherRow = wrapper.findAll('.goods-row[data-kind="consumable"]').find((row) => row.text().includes("Ether"))!;
        expect(etherRow.find(".xp-app-row__subtitle").text()).toBe("Restores 50 MP");
        await etherRow.trigger("click");

        const hero = useUserStore().users["hero-1"] as any;
        expect(hero.stats.mp.now).toBe(60);
        expect(hero.inventory.some((row: any) => row.name === "Ether")).toBe(false);
      });

      it("refuses a potion that would do nothing and keeps it, with the reason on the row", async () => {
        hurt(100);
        const wrapper = mountSheet();

        expect(potionRow(wrapper).find(".goods-reason").text()).toBe("Your HP is full.");
        expect(potionRow(wrapper).find(".goods-use-btn").attributes("disabled")).toBeDefined();
        await potionRow(wrapper).trigger("click");

        const hero = useUserStore().users["hero-1"] as any;
        expect(hero.inventory.find((row: any) => row.name === "Health Potion").qty).toBe(3);
        expect(mockToastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: "Your HP is full." }));
      });
    });

    it("shows one list without section headers on a single-kind tab", async () => {
      const wrapper = mountSheet();

      await wrapper.find('.xp-bottom-nav__button[aria-label="Keys"]').trigger("click");

      expect(wrapper.findAll(".xp-app-section__label")).toHaveLength(0);
      const rows = wrapper.findAll(".goods-row");
      expect(rows).toHaveLength(1);
      expect(rows[0].text()).toContain("Old Key");
    });

    it("uses the blurb of an item as its subtitle", () => {
      const wrapper = mountSheet({
        equipment: [{ name: "Ice Wand", faIcon: "wand-magic ice", qty: 1, desc: "Freeze enemies" }],
      });

      const wandRow = wrapper.findAll(".goods-row").find((row) => row.text().includes("Ice Wand"));
      expect(wandRow?.find(".xp-app-row__subtitle").text()).toBe("Freeze enemies");
    });

    it("emits select-item when a row is tapped outside of battle", async () => {
      const wrapper = mountSheet();

      await wrapper.find('.goods-row[data-kind="key"]').trigger("click");

      expect(wrapper.emitted("select-item")).toHaveLength(1);
      expect(wrapper.emitted("select-item")?.[0][0]).toMatchObject({ name: "Old Key" });
      expect(wrapper.emitted("use-item")).toBeUndefined();
    });

    it("emits use-item once from the Use button in battle, and leaves a refused item alone", async () => {
      const battleCard = (item: any) =>
        item.name === "Health Potion"
          ? { name: item.name, faIcon: "flask", mp: 0, effect: "Restores 50 HP", reason: "HP is already full" }
          : { name: item.name, faIcon: "key", mp: 20, effect: "Opens a door", reason: null };
      const wrapper = mountSheet({ mode: "battle", battleCard });

      const keyRow = wrapper.find('.goods-row[data-kind="key"]');
      expect(keyRow.text()).toContain("20 MP");
      await keyRow.find(".goods-use-btn").trigger("click");
      expect(wrapper.emitted("use-item")).toHaveLength(1);
      expect(wrapper.emitted("use-item")?.[0][0]).toMatchObject({ name: "Old Key" });

      const potionRow = wrapper.find('.goods-row[data-kind="consumable"]');
      expect(potionRow.classes()).toContain("is-disabled");
      expect(potionRow.find(".goods-reason").text()).toBe("HP is already full");
      expect(potionRow.find(".goods-use-btn").attributes("disabled")).toBeDefined();
      await potionRow.trigger("click");
      expect(wrapper.emitted("use-item")).toHaveLength(1);
    });

    describe("the Store button", () => {
      const unlockStorage = (tier = 1, storage: unknown[] = []) => {
        const hero = useUserStore().users["hero-1"] as any;
        hero.storageTier = tier;
        hero.storage = storage;
      };

      it("is not there while the storage is locked", () => {
        const wrapper = mountSheet();

        expect(wrapper.find(".goods-store-btn").exists()).toBe(false);
      });

      it("sits on every row but the keys once the storage is bought, and not in a fight", () => {
        unlockStorage();
        const wrapper = mountSheet();

        expect(wrapper.find('.goods-row[data-kind="consumable"] .goods-store-btn').exists()).toBe(true);
        expect(wrapper.find('.goods-row[data-kind="key"] .goods-store-btn').exists()).toBe(false);

        const inFight = mountSheet({ mode: "battle", battleCard: () => null });
        expect(inFight.find(".goods-store-btn").exists()).toBe(false);
        expect(inFight.find(".goods-use-btn").exists()).toBe(true);
      });

      it("moves the whole stack to the storage without opening the item", async () => {
        unlockStorage();
        const wrapper = mountSheet();

        await wrapper.find('.goods-row[data-kind="consumable"] .goods-store-btn').trigger("click");

        const hero = useUserStore().users["hero-1"] as any;
        expect(hero.inventory.map((row: any) => row.name)).toEqual(["Old Key"]);
        expect(hero.storage).toEqual([expect.objectContaining({ name: "Health Potion", qty: 3 })]);
        expect(wrapper.find('.goods-row[data-kind="consumable"]').exists()).toBe(false);
        expect(wrapper.emitted("select-item")).toBeUndefined();
        expect(mockToastCreate).not.toHaveBeenCalled();
      });

      it("tells the hero with a toast when the storage is full and keeps the stack in the bag", async () => {
        const tenStacks = Array.from({ length: 10 }, (_, index) => ({ name: `Stored ${index}`, kind: "material", qty: 1 }));
        unlockStorage(1, tenStacks);
        const wrapper = mountSheet();

        await wrapper.find('.goods-row[data-kind="consumable"] .goods-store-btn').trigger("click");
        await Promise.resolve();

        const hero = useUserStore().users["hero-1"] as any;
        expect(hero.inventory.map((row: any) => row.name)).toContain("Health Potion");
        expect(hero.storage).toHaveLength(10);
        expect(mockToastCreate).toHaveBeenCalledWith(
          expect.objectContaining({ cssClass: "rpg-toast", position: "middle", message: expect.stringContaining("storage is full") })
        );
      });
    });

    it("shows the empty state when the pack holds nothing", () => {
      const userStore = useUserStore();
      userStore.users["hero-1"].inventory = [];
      const wrapper = mountSheet();

      expect(wrapper.find(".goods-row").exists()).toBe(false);
      expect(wrapper.find(".xp-app-empty").text()).toContain("Your pack is empty");
    });
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
