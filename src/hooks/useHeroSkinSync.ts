import { watch } from "vue";
import { skinOf } from "@/lib/services/profile/heroSkin";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The look and feel follows the hero who is playing: whenever someone signs in, or their skin changes, the game
 * store's Retro / Modern switch (fabStyle) takes their choice. A hero with none (an old profile) leaves the device's
 * own choice alone. The other way too: any switch of the game store's look (the profile toggle, the Pegasus Boots) is
 * kept on the hero who is playing. Call once, from the app root.
 */
export function useHeroSkinSync(): void {
  const userStore = useUserStore();
  const gameStore = useGameStore();
  // currentUser carries the whole profile (Object.assign), though its declared shape lists only the sign-in fields
  const hero = () => userStore.currentUser as { id: string | null; skin?: unknown };
  watch(
    () => [hero().id, hero().skin] as const,
    () => {
      const skin = skinOf(hero());
      const isNewLook = skin !== null && skin !== gameStore.fabStyle;
      if (isNewLook) gameStore.setFabStyle(skin);
    },
    { immediate: true }
  );
  watch(
    () => gameStore.fabStyle,
    (style) => {
      const heroId = hero().id;
      const isSwitchToKeep = Boolean(heroId) && skinOf(hero()) !== style;
      if (isSwitchToKeep) userStore.setSkin(heroId as string, style);
    }
  );
}
