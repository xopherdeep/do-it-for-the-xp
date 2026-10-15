import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MyInventory from "../MyInventory.vue";
import { useUserStore } from "@/lib/store/stores/user";

/** The My Goods page: the header counts the bag slots in use ("7/20") and warns when the bag is full. */

const stacks = (count: number) => Array.from({ length: count }, (_, index) => ({ name: `Thing ${index}`, kind: "misc", qty: 2 }));

const mountPage = () =>
  mount(MyInventory, {
    props: { userId: "hero-1" },
    global: { stubs: { XpInventorySheet: true, XpBackButton: true } },
  });

describe("MyInventory", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const seedHero = (inventory: unknown[]) => {
    const store = useUserStore();
    store.users["hero-1"] = { id: "hero-1", name: "Aura", inventory, equipment: { leftHand: [], rightHand: [] } } as any;
  };

  it("shows the slots in use out of 20 in the header", () => {
    seedHero([...stacks(3), { name: "Old Key", kind: "key", qty: 1 }]);

    const wrapper = mountPage();

    // keys never count toward the bag
    expect(wrapper.find(".xp-app-header__meta").text()).toBe("3/20");
    expect(wrapper.find(".goods-header").classes()).not.toContain("is-full");
  });

  it("marks the header when the bag is full", () => {
    seedHero(stacks(20));

    const wrapper = mountPage();

    expect(wrapper.find(".xp-app-header__meta").text()).toBe("20/20");
    expect(wrapper.find(".goods-header").classes()).toContain("is-full");
  });
});
