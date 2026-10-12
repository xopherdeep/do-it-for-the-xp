import { mount } from "@vue/test-utils";
import ShopClerkStage from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopClerkStage.vue";
import ShopWalletWare from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopWalletWare.vue";
import ShopItemCard from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopItemCard.vue";
import ShopItemModal from "@/app/Console/MyPortal/HomeTown/AccessoryShop/components/ShopItemModal.vue";

jest.mock("@/assets/fx", () => ({
  __esModule: true,
  play$fx: jest.fn(),
}));

describe("ShopClerkStage", () => {
  it("renders shopkeeper and greeting when open", () => {
    const wrapper = mount(ShopClerkStage, {
      props: {
        shopkeeper: "Douglas the Pirate",
        shopGreeting: "Rrrrrr matey, I be wilin ta trade with ya.",
        isOpen: true,
        closedLine: "Sorry, we're closed right now.",
        charismaDiscount: "10%",
        backgroundImage: "https://example.com/wrecked-ship.webp",
      },
    });

    expect(wrapper.text()).toContain("Douglas the Pirate");
    expect(wrapper.text()).toContain("Rrrrrr matey, I be wilin ta trade with ya.");
    expect(wrapper.text()).toContain("10% OFF");
    expect(wrapper.find(".shop-closed-cue").exists()).toBe(false);
  });

  it("renders closed cue and message when shop is shut", () => {
    const wrapper = mount(ShopClerkStage, {
      props: {
        shopkeeper: "Douglas the Pirate",
        shopGreeting: "Rrrrrr matey",
        isOpen: false,
        closedLine: "Doors open at 8:00 AM.",
        charismaDiscount: "10%",
        backgroundImage: "https://example.com/wrecked-ship.webp",
      },
    });

    expect(wrapper.text()).toContain("CLOSED:");
    expect(wrapper.text()).toContain("Doors open at 8:00 AM.");
    expect(wrapper.text()).not.toContain("10% OFF");
  });
});

describe("ShopWalletWare", () => {
  const sampleWare = {
    name: "Bigger Wallet (1000 GP)",
    blurb: "Holds 1000 GP.",
    price: 500,
    status: "for-sale" as const,
    note: "Upgrade your capacity.",
  };

  it("renders wallet name, blurb, and price tag", () => {
    const wrapper = mount(ShopWalletWare, {
      props: {
        walletWare: sampleWare,
        isBuying: false,
      },
    });

    expect(wrapper.text()).toContain("Bigger Wallet (1000 GP)");
    expect(wrapper.text()).toContain("Holds 1000 GP.");
    expect(wrapper.text()).toContain("500 GP");
    expect(wrapper.text()).toContain("Tap to upgrade wallet");
  });

  it("emits buy event when clicked", async () => {
    const wrapper = mount(ShopWalletWare, {
      props: {
        walletWare: sampleWare,
        isBuying: false,
      },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("buy")).toBeTruthy();
  });

  it("shows locked note when status is locked", () => {
    const wrapper = mount(ShopWalletWare, {
      props: {
        walletWare: {
          ...sampleWare,
          status: "locked" as const,
          note: "LVL 5 needed.",
        },
        isBuying: false,
      },
    });

    expect(wrapper.text()).toContain("LVL 5 needed.");
    expect(wrapper.find(".is-locked").exists()).toBe(true);
  });
});

describe("ShopItemCard", () => {
  const sampleItem = {
    id: "item-1",
    name: "Frost Treat",
    price: 25,
    description: "Cool and refreshing.",
    icon: "ice-cream",
    photo: "",
  };

  it("renders item name and affordable price state", () => {
    const wrapper = mount(ShopItemCard, {
      props: {
        item: sampleItem,
        canAfford: true,
        wallet: 100,
      },
    });

    expect(wrapper.text()).toContain("Frost Treat");
    expect(wrapper.text()).toContain("25 GP");
    expect(wrapper.find(".price-badge.is-affordable").exists()).toBe(true);
    expect(wrapper.find(".shortage-badge").exists()).toBe(false);
  });

  it("renders shortage indicator when unaffordable", () => {
    const wrapper = mount(ShopItemCard, {
      props: {
        item: sampleItem,
        canAfford: false,
        wallet: 10,
      },
    });

    expect(wrapper.text()).toContain("Need 15");
    expect(wrapper.find(".price-badge.is-short").exists()).toBe(true);
  });

  it("emits inspect event on click", async () => {
    const wrapper = mount(ShopItemCard, {
      props: {
        item: sampleItem,
        canAfford: true,
        wallet: 100,
      },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("inspect")).toBeTruthy();
    expect(wrapper.emitted("inspect")![0]).toEqual([sampleItem]);
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
  it("mounts and renders shopkeeper stage and controls", async () => {
    const { createPinia, setActivePinia } = await import("pinia");
    const pinia = createPinia();
    setActivePinia(pinia);
    const AccessoryShop = (await import("@/app/Console/MyPortal/HomeTown/AccessoryShop/AccessoryShop.vue")).default;

    const wrapper = mount(AccessoryShop, {
      props: {
        merchant: "hermits-tent",
        userId: "test-user",
      },
      global: {
        plugins: [pinia],
        stubs: {
          "ion-page": { template: "<div><slot /></div>" },
          "ion-header": { template: "<div><slot /></div>" },
          "ion-toolbar": { template: "<div><slot /></div>" },
          "ion-buttons": { template: "<div><slot /></div>" },
          "ion-back-button": { template: "<div><slot /></div>" },
          "ion-title": { template: "<div><slot /></div>" },
          "ion-button": { template: "<button><slot /></button>" },
          "ion-content": { template: "<div><slot /></div>" },
          "xp-loading": { template: "<div>loading</div>" },
          "xp-gp": { template: "<span>{{ gp }} GP</span>", props: ["gp"] },
          "ATMModal": { template: "<div>ATM</div>" },
        },
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".header-wallet-btn").exists()).toBe(true);
    expect(wrapper.findComponent({ name: "ShopClerkStage" }).exists()).toBe(true);
  });
});
