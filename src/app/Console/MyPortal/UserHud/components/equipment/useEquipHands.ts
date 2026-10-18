import { computed, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import type { EquipmentItem } from "./EquipmentItems";

type HeldEntry = EquipmentItem & { slotIndex?: number };
type Slots = (EquipmentItem | null)[];

/**
 * The hero's hands as the Equipment screen edits them: two slots a hand (only the first is used), the set of
 * equipped icons, and setHandItem / clearHandItem that report each change through `onChange` (the page saves it). The
 * slots follow `held`, what the hero really holds, on opening and again after every saved change.
 */
export function useEquipHands(
  held: () => HeldEntry[] | undefined,
  catalogue: () => EquipmentItem[],
  onChange: (item: EquipmentItem | null, hand: string, index: number) => void
) {
  const leftHandSlots = ref<Slots>([null, null]);
  const rightHandSlots = ref<Slots>([null, null]);
  const equippedItems = ref(new Set<string>());

  watch(
    held,
    (entries) => {
      if (!entries) return;
      const hands: Record<string, Slots> = { left: [null, null], right: [null, null] };
      equippedItems.value = new Set<string>();
      entries.forEach((entry) => {
        const slots = hands[entry.hand ?? ""];
        const index = entry.slotIndex ?? 0;
        const hasNoFreeHandSlot = !slots || index > 1;
        if (hasNoFreeHandSlot) return;
        slots[index] = catalogue().find((item) => item.faIcon === entry.faIcon) ?? entry;
        equippedItems.value.add(entry.faIcon);
      });
      leftHandSlots.value = hands.left;
      rightHandSlots.value = hands.right;
    },
    { immediate: true, deep: true }
  );

  const equippedIcons = computed(() => Array.from(equippedItems.value));
  const slotsOf = (hand: string) => (hand === "left" ? leftHandSlots : rightHandSlots);

  const clearHandItem = async (hand: string, index: number, withSound = true) => {
    const slots = slotsOf(hand);
    const itemToUnequip = slots.value[index];
    if (!itemToUnequip) return;
    slots.value[index] = null;
    equippedItems.value.delete(itemToUnequip.faIcon);
    onChange(null, hand, index);
    if (withSound) play$fx("cursor");
  };

  /** Puts `item` in `hand`, moving it out of the other hand first and replacing what was there */
  const setHandItem = async (item: EquipmentItem, hand: string, index: number) => {
    const otherHand = hand === "left" ? "right" : "left";
    const otherIndex = slotsOf(otherHand).value.findIndex((slot) => slot?.faIcon === item.faIcon);
    const isInOtherHand = otherIndex !== -1;
    if (isInOtherHand) await clearHandItem(otherHand, otherIndex, false);

    const slots = slotsOf(hand);
    const replaced = slots.value[index];
    if (replaced) equippedItems.value.delete(replaced.faIcon);
    slots.value[index] = { ...item };
    equippedItems.value.add(item.faIcon);
    onChange(slots.value[index], hand, index);
    // The stage shows the change: the hand fills and the hero takes it up
    play$fx(replaced ? "select" : "equip");
  };

  return { leftHandSlots, rightHandSlots, equippedIcons, setHandItem, clearHandItem };
}
