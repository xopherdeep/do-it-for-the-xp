import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBestiarySelectionStore = defineStore('bestiary-selection', () => {
  const selectedBeastIds = ref<string[]>([]);
  const lastSource = ref<string | null>(null); // e.g., 'temple-creator-room'
  const callback = ref<((ids: string[]) => void) | null>(null);

  function setSelectedBeasts(ids: string[]) {
    selectedBeastIds.value = ids;
  }

  function startSelection(initialIds: string[], source: string, onConfirm: (ids: string[]) => void) {
    selectedBeastIds.value = [...initialIds];
    lastSource.value = source;
    callback.value = onConfirm;
  }

  function confirmSelection() {
    if (callback.value) {
      callback.value(selectedBeastIds.value);
    }
    clear();
  }

  function clear() {
    selectedBeastIds.value = [];
    lastSource.value = null;
    callback.value = null;
  }

  return {
    selectedBeastIds,
    lastSource,
    setSelectedBeasts,
    startSelection,
    confirmSelection,
    clear
  };
});
