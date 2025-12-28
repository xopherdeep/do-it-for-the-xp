import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useItemSelectionStore = defineStore('item-selection', () => {
  const selectedItemIds = ref<string[]>([]);
  const lastSource = ref<string | null>(null); // e.g., 'shop-items-tab'
  const callback = ref<((ids: string[]) => void) | null>(null);

  function setSelectedItems(ids: string[]) {
    selectedItemIds.value = ids;
  }

  function startSelection(initialIds: string[], source: string, onConfirm: (ids: string[]) => void) {
    selectedItemIds.value = [...initialIds];
    lastSource.value = source;
    callback.value = onConfirm;
  }

  function confirmSelection(ids?: string[]) {
    const finalIds = ids || selectedItemIds.value;
    if (callback.value) {
      callback.value(finalIds);
    }
    clear();
  }

  function clear() {
    selectedItemIds.value = [];
    lastSource.value = null;
    callback.value = null;
  }

  return {
    selectedItemIds,
    lastSource,
    callback,
    setSelectedItems,
    startSelection,
    confirmSelection,
    clear
  };
});
