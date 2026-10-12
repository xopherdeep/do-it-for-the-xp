import { mount } from "@vue/test-utils";
import ShopItemSlide from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopItemSlide.vue";
import ShopItemModal from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopItemModal.vue";
import XpNpcDialog from "@/components/molecules/Dialog/XpNpcDialog.vue";
import { worldColor } from "@/lib/engine/core/worldRegistry";
import { merchantWorldOn } from "@/lib/services/shops/travelingMerchant";

jest.mock("@/assets/fx", () => ({
  __esModule: true,
  play$fx: jest.fn(),
}));
// Jest 27 cannot follow swiper's package exports; the page spec stubs the shelf anyway
jest.mock("swiper/vue", () => ({ Swiper: { template: "<div><slot /></div>" }, SwiperSlide: { template: "<div><slot /></div>" } }), {
  virtual: true,
});
jest.mock("swiper/css", () => ({}), { virtual: true });

// The voxel model needs WebGL; these specs are about the shelf, not the renderer
const itemModelStub = { template: "<div class='item-model-stub' />", props: ["icon", "photo", "name", "size", "spinning"] };

describe("ShopItemSlide", () => {
  const mountSlide = (props: Record<string, unknown>) =>
    mount(ShopItemSlide, {
      props: { name: "Picture Show Ticket", price: 37, icon: "film", ...props },
      global: { stubs: { XpItemModel: itemModelStub } },
    });

  it("shows the item's name and price with no shortfall when the wallet covers it", () => {
    const wrapper = mountSlide({ affordable: true });
    expect(wrapper.text()).toContain("Picture Show Ticket");
    expect(wrapper.text()).toContain("37 GP");
    expect(wrapper.text()).not.toContain("Need");
    expect(wrapper.classes()).not.toContain("is-short");
  });

  it("says how much more GP is needed when the wallet falls short", () => {
    const wrapper = mountSlide({ affordable: false, shortBy: 70, price: 110 });
    expect(wrapper.text()).toContain("Need 70 more");
    expect(wrapper.classes()).toContain("is-short");
  });

  it("shows its own note instead of the shortfall (an owned wallet)", () => {
    const wrapper = mountSlide({ affordable: false, shortBy: 10, note: "Owned" });
    expect(wrapper.text()).toContain("Owned");
    expect(wrapper.text()).not.toContain("Need");
  });

  it("turns the model only while it is the slide on show, and reports a pick", async () => {
    const wrapper = mountSlide({ active: true });
    expect(wrapper.findComponent(itemModelStub).props("spinning")).toBe(true);
    await wrapper.trigger("click");
    expect(wrapper.emitted("pick")).toHaveLength(1);
    await wrapper.setProps({ active: false });
    expect(wrapper.findComponent(itemModelStub).props("spinning")).toBe(false);
  });
});

describe("XpNpcDialog", () => {
  const typingStub = {
    name: "XpTypingText",
    template: "<span class='typing-stub'>{{ text }}</span>",
    props: ["text", "hasMoreText"],
    emits: ["typing-complete"],
    methods: { completeTyping() {} },
  };
  const mountDialog = () =>
    mount(XpNpcDialog, {
      props: { open: true, speaker: "Old Man Morris", lines: ["Hello!", "8% off for you."] },
      global: {
        stubs: {
          XpTypingText: typingStub,
          IonCard: { template: "<div class='card-stub'><slot /></div>" },
          IonCardTitle: { template: "<div class='title-stub'><slot /></div>" },
        },
      },
    });

  it("finishes the line on the first tap, turns to the next on the second, and closes after the last", async () => {
    const wrapper = mountDialog();
    expect(wrapper.text()).toContain("Old Man Morris");
    expect(wrapper.text()).toContain("Hello!");

    await wrapper.trigger("click"); // finish typing
    expect(wrapper.text()).toContain("Hello!");
    await wrapper.trigger("click"); // next line
    expect(wrapper.text()).toContain("8% off for you.");

    wrapper.findComponent(typingStub).vm.$emit("typing-complete");
    await wrapper.trigger("click");
    expect(wrapper.emitted("update:open")?.[0]).toEqual([false]);
    expect(wrapper.emitted("done")).toHaveLength(1);
  });

  it("shows one arrow at most: the typing text's own, and only while more lines wait", async () => {
    const wrapper = mountDialog();
    expect(wrapper.findComponent(typingStub).props("hasMoreText")).toBe(true);
    expect(wrapper.find(".dialog-indicator").exists()).toBe(false);
    await wrapper.trigger("click");
    await wrapper.trigger("click");
    expect(wrapper.findComponent(typingStub).props("hasMoreText")).toBe(false);
  });
});

describe("worldColor", () => {
  it("dresses a shop in its world's colour", () => {
    expect(worldColor("forest")).toBe("success");
    expect(worldColor("mountains")).toBe("danger");
    expect(worldColor("hometown")).toBe("rpg");
  });

  it("gives a shop with no world of its own (the traveling merchant) purple", () => {
    expect(worldColor("traveling")).toBe("secondary");
    expect(worldColor(undefined)).toBe("secondary");
  });
});

describe("ShopItemModal", () => {
  const sampleItem = {
    id: "item-2",
    name: "Tome From The Bookseller",
    price: 60,
    description: "Ancient lore of the islands.",
    icon: "book",
    photo: "",
  };

  it("renders economics breakdown and buy button for affordable item", () => {
    const wrapper = mount(ShopItemModal, {
      props: {
        isOpen: true,
        item: sampleItem,
        canAfford: true,
        wallet: 100,
        isBuying: false,
      },
      global: {
        stubs: {
          IonModal: { template: "<div class='stub-modal'><slot /></div>" },
          IonButton: { template: "<button class='stub-btn'><slot /></button>" },
        },
      },
    });

    expect(wrapper.text()).toContain("Tome From The Bookseller");
    expect(wrapper.text()).toContain("Ancient lore of the islands.");
    expect(wrapper.text()).toContain("100 GP");
    expect(wrapper.text()).toContain("60 GP");
    expect(wrapper.text()).toContain("40 GP"); // After balance
    expect(wrapper.text()).toContain("Buy Item (60 GP)");
  });

  it("shows shortage status when unaffordable", () => {
    const wrapper = mount(ShopItemModal, {
      props: {
        isOpen: true,
        item: sampleItem,
        canAfford: false,
        wallet: 20,
        isBuying: false,
      },
      global: {
        stubs: {
          IonModal: { template: "<div class='stub-modal'><slot /></div>" },
          IonButton: { template: "<button class='stub-btn'><slot /></button>" },
        },
      },
    });

    expect(wrapper.text()).toContain("SHORT");
    expect(wrapper.text()).toContain("40 GP"); // Short by 40
    expect(wrapper.text()).toContain("Not Enough GP");
  });
});

describe("AccessoryShop Page", () => {
  const slot = { template: "<div><slot /></div>" };
  const mountShop = async (merchant: string) => {
    const { createPinia, setActivePinia } = await import("pinia");
    const pinia = createPinia();
    setActivePinia(pinia);
    const AccessoryShop = (await import("@/app/Console/MyPortal/HomeTown/AccessoryShop/AccessoryShop.vue")).default;
    const wrapper = mount(AccessoryShop, {
      props: { merchant, userId: "test-user" },
      global: {
        plugins: [pinia],
        stubs: {
          "ion-page": slot,
          "ion-header": slot,
          "ion-footer": slot,
          "ion-toolbar": { template: "<div class='toolbar-stub' :data-color='color'><slot /></div>", props: ["color"] },
          "ion-buttons": slot,
          "ion-back-button": slot,
          "ion-title": slot,
          "ion-grid": slot,
          "ion-row": slot,
          "ion-col": slot,
          "ion-button": { template: "<button class='ion-button-stub'><slot /></button>" },
          "ion-icon": true,
          "ion-select": slot,
          "ion-select-option": slot,
          "ion-searchbar": true,
          "ion-fab": slot,
          "ion-fab-button": { template: "<button class='clerk-fab'><slot /></button>" },
          "ion-content": slot,
          "xp-loading": { template: "<div>loading</div>" },
          "xp-gp": { template: "<span>{{ gp }} GP</span>", props: ["gp"] },
          ATMModal: { template: "<div>ATM</div>" },
          XpNpcDialog: true,
          ShopShelfSlider: true,
          ShopItemModal: true,
        },
      },
    });
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  it("mounts with the wallet button, the clerk's button and the < > shelf buttons", async () => {
    const wrapper = await mountShop("hermits-tent");
    expect(wrapper.find(".header-wallet-btn").exists()).toBe(true);
    expect(wrapper.find(".clerk-fab").exists()).toBe(true);
    expect(wrapper.findAll(".ion-button-stub")).toHaveLength(2);
    expect(wrapper.text()).toContain("Can Afford");
    // The Hermit's Tent stands in the Forest, so its bars are the Forest's green
    expect(wrapper.find(".toolbar-stub").attributes("data-color")).toBe("success");
  });

  it("dresses the traveling merchant's shop in the colours of the world the merchant visits today", async () => {
    const wrapper = await mountShop("traveling-merchant");
    expect(wrapper.find(".toolbar-stub").attributes("data-color")).toBe(worldColor(merchantWorldOn(new Date())));
  });
});
