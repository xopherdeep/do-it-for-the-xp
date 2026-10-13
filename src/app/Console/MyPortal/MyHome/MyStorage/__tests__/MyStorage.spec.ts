import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MyStorage from "../MyStorage.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppEmpty from "@/components/organisms/XpApp/XpAppEmpty.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { play$fx } from "@/assets/fx";

/**
 * The Storage app on the phone apps kit, showing the hero's real storage (user.storage): a locked storage says where
 * to buy it, an unlocked one lists its stacks as rows with a Take button, the header counts used / max slots, the
 * dock filters by kind (keys never take a slot), and a full bag keeps the stack and says so. The user store is the real
 * one; only what it saves to and the sound board are faked.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile() {
      return Promise.resolve();
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const mockPush = jest.fn();
jest.mock("vue-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockToast = jest.fn();
jest.mock("@/hooks/useToast", () => ({ useToast: () => ({ showToast: mockToast }) }));

const mockPresent = jest.fn();
const mockCreate = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  actionSheetController: {
    create: (...args: any[]) => {
      mockCreate(...args);
      return Promise.resolve({ present: mockPresent, onDidDismiss: () => Promise.resolve({}) });
    },
  },
}));

const playFx = play$fx as jest.Mock;

const pass = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: { template: "<div class='ion-page'><slot /></div>" },
  IonHeader: pass,
  IonToolbar: pass,
  IonContent: pass,
  IonFooter: pass,
  IonFab: pass,
  IonFabButton: { template: "<button class='fab-stub'><slot /></button>" },
  XpInventoryModal: {
    props: ["isOpen", "userId"],
    emits: ["close"],
    template: "<div class='goods-modal-stub' :data-open='String(isOpen)' :data-user='userId' />",
  },
  XpBackButton: { template: "<button class='back-stub' />" },
  XpAppBottomNav: { props: ["tabs", "modelValue"], template: "<nav class='dock-stub' />" },
};
const components = { XpAppHeader, XpAppSection, XpAppRow, XpAppChip, XpAppEmpty };

const POTION = { id: "potion", name: "Potion", kind: "consumable", qty: 3, faIcon: "flask" };
const ETHER = { id: "ether", name: "Ether", kind: "consumable", qty: 2, description: "Restores 20 MP" };
const ROPE = { id: "rope", name: "Rope", kind: "misc", qty: 1 };

/** A bag with `count` other stacks in it. */
const stacks = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `thing-${i}`, name: `Thing ${i}`, qty: 1 }));

const mountPage = (profile: Record<string, unknown> = {}) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero-1", ...profile });
  const wrapper = mount(MyStorage, { props: { userId: "hero-1" }, global: { stubs, components } });
  return { wrapper, store };
};

const dock = (wrapper: ReturnType<typeof mountPage>["wrapper"]) => wrapper.findComponent(stubs.XpAppBottomNav);

beforeEach(() => {
  localStorage.clear();
  mockPush.mockClear();
  mockToast.mockClear();
  mockCreate.mockClear();
  mockPresent.mockClear();
  playFx.mockClear();
});

describe("MyStorage on the XpApp kit", () => {
  it("wears the storage accent and the retro skin class on the page root, the modern one when toggled", () => {
    const { wrapper } = mountPage();

    const root = wrapper.find(".ion-page");
    expect(root.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--retro", "my-storage"]));
    expect(root.attributes("style")).toContain("--xp-app-accent: #2fa9a0");

    localStorage.setItem("fabStyle", "modern");
    expect(mountPage().wrapper.find(".ion-page").classes()).toContain("xp-app--modern");
  });

  describe("locked storage", () => {
    it("says where to buy it, with a button to the Gold Bank, and no search bar", async () => {
      const { wrapper } = mountPage({ inventory: [POTION] });

      expect(wrapper.find(".xp-app-row").exists()).toBe(false);
      expect(wrapper.find(".xp-app-empty__text").text()).toBe("Storage is locked. Buy a storage box at the Gold Bank.");
      expect(wrapper.find(".xp-app-header__meta").text()).toBe("Locked");
      expect(wrapper.find(".xp-app-search").exists()).toBe(false);

      await wrapper.find(".xp-app-empty button").trigger("click");

      expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
    });

    it("keeps the dock tabs", () => {
      const { wrapper } = mountPage();

      expect((dock(wrapper).props("tabs") as any[]).map((t) => t.label)).toEqual(["All", "HP", "MP", "Misc", "Key"]);
    });
  });

  describe("unlocked storage", () => {
    const unlocked = () => ({ storageTier: 1, storage: [POTION, ETHER, ROPE], inventory: [] });

    it("counts used / max slots in the header and lists each stack as a row with its quantity and a Take button", () => {
      const { wrapper } = mountPage(unlocked());

      expect(wrapper.find(".xp-app-header__meta").text()).toBe("3/10 slots");
      const rows = wrapper.findAll(".xp-app-row");
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.find(".xp-app-row__title").text())).toEqual(["Ether", "Potion", "Rope"]);
      expect(rows[0].find(".xp-app-row__subtitle").text()).toBe("Restores 20 MP");
      expect(rows[1].find(".xp-app-row__subtitle").text()).toBe("Potion");
      expect(rows[1].find(".xp-app-chip").text()).toBe("×3");
      expect(rows[1].find("button.xp-app-btn").text()).toBe("Take");
      expect(wrapper.find(".xp-app-section__label").text()).toBe("In storage · Bag 0/20");
      expect(wrapper.find(".xp-app-search input").exists()).toBe(true);
    });

    it("takes the whole stack back into the bag", async () => {
      const { wrapper, store } = mountPage(unlocked());

      await wrapper.findAll(".xp-app-row")[1].find("button.xp-app-btn").trigger("click");

      expect(JSON.parse(JSON.stringify(store.users["hero-1"].inventory))).toEqual([
        expect.objectContaining({ id: "potion", qty: 3 }),
      ]);
      expect(wrapper.findAll(".xp-app-row")).toHaveLength(2);
      expect(wrapper.find(".xp-app-header__meta").text()).toBe("2/10 slots");
      expect(playFx).toHaveBeenCalledWith("select");
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("keeps the stack in storage and says so in a middle toast when the bag has no room", async () => {
      const { wrapper, store } = mountPage({ ...unlocked(), inventory: stacks(20) });

      await wrapper.findAll(".xp-app-row")[1].find("button.xp-app-btn").trigger("click");
      await Promise.resolve();

      expect(wrapper.findAll(".xp-app-row")).toHaveLength(3);
      expect(store.users["hero-1"].inventory).toHaveLength(20);
      expect(mockToast).toHaveBeenCalledWith("Your bag is full. Make room first.", 3000, "middle");
      expect(playFx).toHaveBeenCalledWith("no");
    });

    it("filters by kind from the dock: HP, MP and Misc", async () => {
      const { wrapper } = mountPage(unlocked());
      const titles = () => wrapper.findAll(".xp-app-row__title").map((t) => t.text());

      dock(wrapper).vm.$emit("change", "hp");
      await wrapper.vm.$nextTick();
      expect(titles()).toEqual(["Potion"]);
      expect(wrapper.find(".xp-app-section__label").text()).toContain("HP items");

      dock(wrapper).vm.$emit("change", "mp");
      await wrapper.vm.$nextTick();
      expect(titles()).toEqual(["Ether"]);

      dock(wrapper).vm.$emit("change", "misc");
      await wrapper.vm.$nextTick();
      expect(titles()).toEqual(["Rope"]);

      dock(wrapper).vm.$emit("change", "all");
      await wrapper.vm.$nextTick();
      expect(titles()).toHaveLength(3);
    });

    it("says which shelf is empty when other shelves hold stacks", async () => {
      const { wrapper } = mountPage({ storageTier: 1, storage: [POTION] });

      dock(wrapper).vm.$emit("change", "mp");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".xp-app-empty__text").text()).toBe("No MP items in storage.");
    });

    it("explains on the Key tab that keys ride in the bag and never take a slot", async () => {
      const { wrapper } = mountPage(unlocked());

      dock(wrapper).vm.$emit("change", "key");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".xp-app-row").exists()).toBe(false);
      expect(wrapper.find(".xp-app-empty__text").text()).toBe("Key items ride in your bag and never take a slot.");
    });

    it("searches the stored names from the bar above the dock", async () => {
      const { wrapper } = mountPage(unlocked());

      expect(wrapper.find(".storage-footer .xp-app-bar .xp-app-search input").exists()).toBe(true);
      await wrapper.find(".xp-app-search input").setValue("rop");
      expect(wrapper.findAll(".xp-app-row__title").map((t) => t.text())).toEqual(["Rope"]);

      await wrapper.find(".xp-app-search input").setValue("zzz");
      expect(wrapper.find(".xp-app-empty__text").text()).toContain("matches that search");
    });

    it("says storage is empty, and where things come from, when nothing is stored", () => {
      const { wrapper } = mountPage({ storageTier: 2 });

      expect(wrapper.find(".xp-app-header__meta").text()).toBe("0/20 slots");
      expect(wrapper.find(".xp-app-empty__text").text()).toBe("Nothing stored yet. Store items from My Goods.");
      expect(wrapper.find(".xp-app-empty button").exists()).toBe(false);
    });
  });

  describe("the options FAB and its action sheet", () => {
    /** Tap the FAB and hand back the buttons the action sheet was created with. */
    const openSheet = async (wrapper: ReturnType<typeof mountPage>["wrapper"]) => {
      mockCreate.mockClear();
      await wrapper.find(".storage-fab").trigger("click");
      await Promise.resolve();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate.mock.calls[0][0].header).toBe("What would you like to do...?");
      expect(mockPresent).toHaveBeenCalled();
      return mockCreate.mock.calls[0][0].buttons as any[];
    };

    it("is the page's only way in: a FAB in the content, no header menu button", () => {
      const { wrapper } = mountPage();

      expect(wrapper.find(".xp-app-header .xp-app-btn").exists()).toBe(false);
      expect(wrapper.find(".storage-fab").exists()).toBe(true);
    });

    it("sends a locked storage to the Gold Bank and offers nothing else", async () => {
      const { wrapper } = mountPage();

      const buttons = await openSheet(wrapper);

      expect(buttons.map((b) => b.text)).toEqual(["Visit the Gold Bank", "Cancel"]);
      buttons[0].handler();
      expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
    });

    it("adds items from the bag through the Goods modal, and the list follows when stacks move", async () => {
      const { wrapper, store } = mountPage({ storageTier: 1, inventory: [POTION] });
      const modal = () => wrapper.findComponent(stubs.XpInventoryModal);
      expect(modal().props("isOpen")).toBe(false);
      expect(modal().props("userId")).toBe("hero-1");

      const buttons = await openSheet(wrapper);
      expect(buttons[0].text).toBe("Add items from bag");
      buttons[0].handler();
      await wrapper.vm.$nextTick();
      expect(modal().props("isOpen")).toBe(true);

      // The Goods sheet stores a stack with the store action; the Storage list shows it without a reload.
      expect(wrapper.find(".xp-app-row").exists()).toBe(false);
      store.storeItem("hero-1", "potion");
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll(".xp-app-row__title").map((t) => t.text())).toEqual(["Potion"]);
      expect(wrapper.find(".xp-app-header__meta").text()).toBe("1/10 slots");

      modal().vm.$emit("close");
      await wrapper.vm.$nextTick();
      expect(modal().props("isOpen")).toBe(false);
    });

    it("offers the next tier by the banker's own words and routes to the bank, and drops it at the biggest storage", async () => {
      const { wrapper } = mountPage({ storageTier: 1 });

      const buttons = await openSheet(wrapper);
      expect(buttons.map((b) => b.text)).toEqual([
        "Add items from bag",
        "Bigger storage: 20 slots for 250 GP",
        "Cancel",
      ]);
      buttons[1].handler();
      expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });

      const maxed = await openSheet(mountPage({ storageTier: 4 }).wrapper);
      expect(maxed.map((b) => b.text)).toEqual(["Add items from bag", "Cancel"]);
    });

    it("has no placeholder options left", async () => {
      const buttons = await openSheet(mountPage({ storageTier: 2 }).wrapper);

      const texts = buttons.map((b) => b.text).join("|");
      expect(texts).not.toMatch(/Remove Items|Some other action/);
      buttons.filter((b) => b.role !== "cancel").forEach((b) => expect(typeof b.handler).toBe("function"));
    });
  });
});
