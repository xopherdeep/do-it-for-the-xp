import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import XpEquipmentModal from "@/app/Console/MyPortal/UserHud/components/XpEquipmentModal.vue";
import EquippedItemsCard from "@/app/Console/MyPortal/UserHud/components/equipment/EquippedItemsCard.vue";
import EquipmentGrid from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentGrid.vue";
import ItemInfoModal from "@/app/Console/MyPortal/UserHud/components/equipment/ItemInfoModal.vue";
import XpClassCodex from "@/app/Console/MyPortal/UserHud/components/ClassCodex/XpClassCodex.vue";
import type { EquipmentItem } from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems";
import { useUserStore } from "@/lib/store/stores/user";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

/**
 * The Equipment bag in its battle mode: the real XpEquipmentModal, grid, dock and item card on the real catalogue.
 * Only what a browser provides is replaced: Ionic's overlay (a plain div that always renders its slot), the toast
 * controller, the sound board and the class codex. The bag decides no battle rules: the page hands it `battleCard`
 * and `opensDirectly`, so here they are fixed fakes.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: jest.fn().mockResolvedValue({ present: jest.fn() }) },
}));

const IonModalStub = defineComponent({
  name: "IonModal",
  props: { isOpen: Boolean },
  render() {
    return h("div", { class: "ion-modal-stub" }, this.$slots.default?.());
  },
});
const blank = defineComponent({ render: () => null });

const card = (overrides: Partial<BattleItemCard> = {}): BattleItemCard => ({
  name: "Ice Wand",
  faIcon: "wand-magic ice",
  mp: 50,
  effect: "+10 minutes on the clock",
  reason: null,
  ...overrides,
});

const CONTAINERS = ["Bottles", "Goods", "Book Of Spells"];
const heldIce = { faIcon: "wand-magic ice", name: "Ice Wand", desc: "", hand: "left", slotIndex: 0 } as EquipmentItem;

const DROPPED = JSON.stringify({ faIcon: "wand-magic ice", name: "Ice Wand", desc: "" });

type Props = Record<string, unknown>;

const open = async (props: Props = {}) => {
  setActivePinia(createPinia());
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/p/:userId", component: blank }] });
  await router.push("/p/u1");
  await router.isReady();
  return mount(XpEquipmentModal, {
    props: { isOpen: true, equipment: [], user: { id: "u1", jobClass: "Mage" }, ...props },
    global: { plugins: [router], stubs: { IonModal: IonModalStub, XpClassCodex: true } },
  });
};

const battle = (props: Props = {}) =>
  open({
    mode: "battle",
    battleCard: () => card(),
    opensDirectly: (item: EquipmentItem) => CONTAINERS.includes(item.name),
    ...props,
  });

type Opened = Awaited<ReturnType<typeof open>>;

/** The grid tile of a catalogue item, found by its icon classes ("wand-magic ice" is fa-wand-magic plus ice). */
const tile = (wrapper: Opened, icon: string) => {
  const [first, ...rest] = icon.split(" ");
  const found = wrapper.findAll(".grid-item").find((t) => {
    const classes = t.find("i").classes();
    return classes.includes(`fa-${first}`) && rest.every((extra) => classes.includes(extra));
  });
  if (!found) throw new Error(`no tile for ${icon}`);
  return found;
};
const iceWandTile = (wrapper: Opened) => tile(wrapper, "wand-magic ice");
const bottlesTile = (wrapper: Opened) => tile(wrapper, "flask-potion");

describe("XpEquipmentModal in battle mode", () => {
  let mounted: Opened | undefined;

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it("battle mode: a fight item's card shows MP and effect, and Use emits use-item", async () => {
    mounted = await battle();
    await iceWandTile(mounted).trigger("click");

    const info = mounted.findComponent(ItemInfoModal);
    expect(info.exists()).toBe(true);
    expect(info.props("mode")).toBe("battle");
    const use = mounted.find("[data-cy=item-use]");
    expect(use.exists()).toBe(true);
    expect(use.attributes("disabled")).toBeUndefined();
    expect(use.text()).toBe("Use");
    expect(info.text()).toContain("50 MP");
    expect(info.text()).toContain("+10 minutes on the clock");
    expect(mounted.find("[data-cy=item-reason]").exists()).toBe(false);

    await use.trigger("click");
    const used = mounted.emitted("use-item") as EquipmentItem[][];
    expect(used).toHaveLength(1);
    expect(used[0][0].name).toBe("Ice Wand");
  });

  it("battle mode: Use closes the info card, and a card without MP shows no MP pill", async () => {
    mounted = await battle({ battleCard: () => card({ mp: 0, effect: "Your Powers" }) });
    await iceWandTile(mounted).trigger("click");
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(true);
    expect(mounted.find("[data-cy=item-mp]").exists()).toBe(false);

    await mounted.find("[data-cy=item-use]").trigger("click");
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(false);
  });

  it("battle mode: the page closing the bag closes an open card with it, and the bag reopens on its grid", async () => {
    mounted = await battle();
    await iceWandTile(mounted).trigger("click");
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(true);

    // A strike, hardware back or leaving the view: the fight closes the bag while the card is up
    await mounted.setProps({ isOpen: false });
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(false);

    // Goods again: no stale card, and nothing was used
    await mounted.setProps({ isOpen: true });
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(false);
    expect(mounted.emitted("use-item")).toBeUndefined();
  });

  it("closing the bag closes the class codex with it", async () => {
    mounted = await open();
    await mounted.find("[data-cy=change-class]").trigger("click");
    const codex = () => mounted?.findComponent(XpClassCodex);
    expect(codex()?.props("isOpen")).toBe(true);

    await mounted.setProps({ isOpen: false });
    expect(codex()?.props("isOpen")).toBe(false);
  });

  it("battle mode: the card shows the effect line instead of the catalogue lore, equip mode keeps the lore", async () => {
    const lore = "Freeze distractions in their tracks";
    mounted = await battle();
    await iceWandTile(mounted).trigger("click");
    const info = mounted.findComponent(ItemInfoModal);
    expect(info.find(".description-box").exists()).toBe(false);
    expect(info.text()).not.toContain(lore);
    expect(info.text()).not.toContain("24 hours");
    expect(info.find("[data-cy=item-effect]").text()).toBe("+10 minutes on the clock");
    mounted.unmount();

    mounted = await open();
    await iceWandTile(mounted).trigger("click");
    expect(mounted.findComponent(ItemInfoModal).find(".description-box").text()).toContain(lore);
  });

  it("battle mode: a card with a reason disables Use and shows why", async () => {
    mounted = await battle({ battleCard: () => card({ reason: "Not enough MP" }) });
    await iceWandTile(mounted).trigger("click");

    const use = mounted.find("[data-cy=item-use]");
    expect(use.attributes("disabled")).toBeDefined();
    expect(mounted.find("[data-cy=item-reason]").text()).toContain("Not enough MP");

    await use.trigger("click");
    expect(mounted.emitted("use-item")).toBeUndefined();
  });

  it("battle mode: Bottles goes straight to use-item without a card", async () => {
    mounted = await battle();
    await bottlesTile(mounted).trigger("click");

    const used = mounted.emitted("use-item") as EquipmentItem[][];
    expect(used).toHaveLength(1);
    expect(used[0][0].name).toBe("Bottles");
    expect(mounted.findComponent(ItemInfoModal).exists()).toBe(false);
  });

  it("battle mode: a locked item opens its card with the reason, even when it would open directly", async () => {
    mounted = await battle({
      user: { id: "u1", jobClass: "Mage", unlockedItems: [] },
      opensDirectly: () => true,
      battleCard: (item: EquipmentItem) => card({ name: item.name, reason: `Locked: ${item.name} waits in a chest.` }),
    });

    await iceWandTile(mounted).trigger("click");
    expect(mounted.emitted("use-item")).toBeUndefined();
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(true);
    expect(mounted.find("[data-cy=item-reason]").text()).toContain("Locked: Ice Wand");
    expect(mounted.find("[data-cy=item-use]").attributes("disabled")).toBeDefined();

    // the containers are never locked: they still go straight in
    await bottlesTile(mounted).trigger("click");
    expect(mounted.emitted("use-item")).toHaveLength(1);
  });

  it("battle mode: the grid cannot be dragged and the dock is read-only", async () => {
    mounted = await battle({ equipment: [heldIce] });

    expect(mounted.findComponent(EquipmentGrid).props("noDrag")).toBe(true);
    expect(mounted.find(".grid-item").attributes("draggable")).toBe("false");
    expect(mounted.findComponent(EquippedItemsCard).props("readonly")).toBe(true);
    expect(mounted.find("[data-cy=change-class]").exists()).toBe(false);

    const setEquipment = jest.spyOn(useUserStore(), "setEquipment");
    mounted.findComponent(EquippedItemsCard).vm.$emit("equip", heldIce, "right", 0);
    await flushPromises();
    expect(mounted.emitted("equip-item")).toBeUndefined();
    expect(setEquipment).not.toHaveBeenCalled();

    await mounted.find(".class-icon-wrapper").trigger("click");
    expect(mounted.findComponent(EquippedItemsCard).emitted("change-class")).toBeUndefined();
  });

  it("battle mode: the dock ignores a dropped item", async () => {
    mounted = await battle();
    await mounted.findAll(".equipment-slot")[0].trigger("drop", { dataTransfer: { getData: () => DROPPED } });
    await flushPromises();
    expect(mounted.findComponent(EquippedItemsCard).emitted("equip")).toBeUndefined();
    expect(mounted.emitted("equip-item")).toBeUndefined();
  });

  it("battle mode: the dock shows the hands the hero holds, and a hand opens its card", async () => {
    mounted = await battle({ equipment: [heldIce] });

    expect(mounted.find(".equipment-slot .item-icon").classes()).toContain("fa-wand-magic");
    await mounted.find(".equipment-slot.has-item").trigger("click");
    expect(mounted.findComponent(ItemInfoModal).props("isOpen")).toBe(true);
    expect(mounted.findComponent(ItemInfoModal).text()).toContain("+10 minutes on the clock");
  });

  it("Use emits once on a double tap", async () => {
    mounted = await battle();
    await iceWandTile(mounted).trigger("click");

    const use = mounted.find("[data-cy=item-use]");
    await use.trigger("click");
    await use.trigger("click");
    expect(mounted.emitted("use-item")).toHaveLength(1);
  });

  it("Use works again when the same card is reopened", async () => {
    mounted = await battle();
    await iceWandTile(mounted).trigger("click");
    await mounted.find("[data-cy=item-use]").trigger("click");

    await iceWandTile(mounted).trigger("click");
    await mounted.find("[data-cy=item-use]").trigger("click");
    expect(mounted.emitted("use-item")).toHaveLength(2);
  });

  it("equip mode is unchanged", async () => {
    mounted = await open();
    await iceWandTile(mounted).trigger("click");

    const info = mounted.findComponent(ItemInfoModal);
    expect(info.props("mode")).toBe("equip");
    expect(mounted.find("[data-cy=item-use]").exists()).toBe(false);
    expect(mounted.find("[data-cy=item-reason]").exists()).toBe(false);
    expect(info.findAll(".slot-btn")).toHaveLength(4);
    expect(info.text()).toContain("EQUIP");
    expect(mounted.findComponent(EquipmentGrid).props("noDrag")).toBe(false);
    expect(mounted.find(".grid-item").attributes("draggable")).toBe("true");
    expect(mounted.findComponent(EquippedItemsCard).props("readonly")).toBe(false);
    expect(mounted.find("[data-cy=change-class]").exists()).toBe(true);

    // a container still opens its card instead of using
    await bottlesTile(mounted).trigger("click");
    expect(mounted.emitted("use-item")).toBeUndefined();
    expect(mounted.findComponent(ItemInfoModal).props("item")).toMatchObject({ name: "Bottles" });
  });

  it("equip mode is unchanged: a dock drop still equips", async () => {
    mounted = await open();
    await mounted.findAll(".equipment-slot")[0].trigger("drop", { dataTransfer: { getData: () => DROPPED } });
    await flushPromises();
    expect(mounted.findComponent(EquippedItemsCard).emitted("equip")).toHaveLength(1);
    expect(mounted.emitted("equip-item")).toHaveLength(1);
    expect(mounted.emitted("use-item")).toBeUndefined();
  });
});
