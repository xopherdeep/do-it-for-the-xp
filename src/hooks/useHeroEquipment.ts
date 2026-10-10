import { computed, ref, watch, type Ref } from "vue";
import { useUserStore } from "@/lib/store/stores/user";

/** An equipped item as the screens handle it: the catalogue entry plus where it sits. */
export interface EquippedItem {
  faIcon?: string;
  name?: string;
  hand?: string;
  slotIndex?: number;
  click?: () => void;
  [key: string]: unknown;
}

/**
 * The hero's hands, shared by the portal and the temples: read from the profile, written back on
 * every change (the user store persists them). The flat `equipment` list is what the equipment
 * screen edits; `leftHandItem` / `rightHandItem` are what the bottom nav shows.
 */
export function useHeroEquipment(userId: Ref<string> | string) {
  const userStore = useUserStore();
  const id = () => String(typeof userId === "string" ? userId : userId.value);
  const user = computed(() => userStore.getUserById(id()));
  const equipment = ref<EquippedItem[]>([]);

  const load = () => {
    const hands = user.value?.equipment;
    if (!hands) {
      equipment.value = [];
      return;
    }
    const fromHand = (items: EquippedItem[] | undefined, hand: string) =>
      (items || []).map((item, slotIndex) => ({ ...item, hand, slotIndex: item.slotIndex ?? slotIndex }));
    equipment.value = [...fromHand(hands.leftHand, "left"), ...fromHand(hands.rightHand, "right")];
  };

  const save = () => {
    const inHand = (hand: string) =>
      equipment.value
        .filter((item) => item.hand === hand)
        .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ click, ...plain }) => plain);
    userStore.setEquipment(id(), { leftHand: inHand("left"), rightHand: inHand("right") });
  };

  watch(() => user.value?.id, () => load(), { immediate: true });

  /** Equip `item` into `hand` slot `index`, or clear the slot when `item` is null. */
  const clickItem = (item: EquippedItem | null, hand: string, index = 0) => {
    if (item === null && hand) {
      equipment.value = equipment.value.filter((i) => !(i.hand === hand && i.slotIndex === index));
      save();
      return;
    }
    const alreadyEquippedIndex = equipment.value.findIndex((i) => i.faIcon === item?.faIcon);
    if (alreadyEquippedIndex !== -1) equipment.value.splice(alreadyEquippedIndex, 1);
    const slotOccupiedIndex = equipment.value.findIndex((i) => i.hand === hand && i.slotIndex === index);
    if (slotOccupiedIndex !== -1) equipment.value.splice(slotOccupiedIndex, 1);
    const itemToEquip = { ...item, hand, slotIndex: index } as EquippedItem;
    if (item?.click && typeof item.click === "function") itemToEquip.click = item.click;
    equipment.value.push(itemToEquip);
    save();
  };

  const leftHandItem = computed<EquippedItem | null>(() => user.value?.equipment?.leftHand?.[0] || null);
  const rightHandItem = computed<EquippedItem | null>(() => user.value?.equipment?.rightHand?.[0] || null);

  return { equipment, leftHandItem, rightHandItem, clickItem, reload: load };
}
