import { onBeforeUnmount, ref, type Ref } from 'vue';
import { preloadImages, templeFloorUrls } from '@/lib/services/temples/templeAssets';

/** How long the floors may take before the loading screen shows: a warm cache never flashes it. */
export const LOADING_SCREEN_DELAY_MS = 250;

/**
 * Holds the temple behind a loading screen until its painted floors are fetched and decoded, so no room slides in
 * bare. The screen only shows when the pictures are slow (the world map usually warmed them while the door was on
 * screen); a temple with no painted floors is ready at once.
 */
export const useTemplePreload = (temple: string, start: Ref<[number, number]>) => {
  const urls = templeFloorUrls(temple, start.value ?? [0, 0]);
  const isReady = ref(urls.length === 0);
  const isLoadingShown = ref(false);
  const done = ref(0);
  const total = ref(urls.length);

  let delay: ReturnType<typeof setTimeout> | undefined;
  if (!isReady.value) {
    delay = setTimeout(() => {
      isLoadingShown.value = !isReady.value;
    }, LOADING_SCREEN_DELAY_MS);
    void preloadImages(urls, {
      onProgress: (count, of) => {
        done.value = count;
        total.value = of;
      }
    }).then(() => {
      isReady.value = true;
      isLoadingShown.value = false;
      clearTimeout(delay);
    });
  }
  onBeforeUnmount(() => clearTimeout(delay));

  return { isTempleReady: isReady, isLoadingShown, loadedFloors: done, totalFloors: total };
};
