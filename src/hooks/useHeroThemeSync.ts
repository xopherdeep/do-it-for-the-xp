import { watch } from "vue";
import { sameTheme, themeOf } from "@/lib/services/profile/heroTheme";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Like useHeroSkinSync, for the game style and menu sounds: they follow the hero who is playing, and any change made in
 * Theme Settings is kept on that hero. A hero with no theme (an old profile) leaves the device's own choice alone.
 * Call once, from the app root.
 */
export function useHeroThemeSync(): void {
  const userStore = useUserStore();
  const gameStore = useGameStore();
  const audioStore = useAudioStore();
  // currentUser carries the whole profile (Object.assign), though its declared shape lists only the sign-in fields
  const hero = () => userStore.currentUser as { id: string | null; themeChoice?: unknown };

  watch(
    () => [hero().id, JSON.stringify(hero().themeChoice ?? null)] as const,
    () => {
      const theme = themeOf(hero());
      const isNewTheme = theme !== null && !sameTheme(theme, gameStore.theme);
      if (!isNewTheme) return;
      gameStore.changeSoundFX(theme);
      // The sound player reads its own copy of the choice
      const fx = audioStore.bgm?.$fx;
      if (fx) fx.theme = { ...fx.theme, ...theme };
    },
    { immediate: true }
  );

  watch(
    () => [gameStore.theme.rpg, gameStore.theme.ui] as const,
    ([rpg, ui]) => {
      const heroId = hero().id;
      const current = themeOf(hero());
      const isChangeToKeep = Boolean(heroId) && !(current && sameTheme(current, { rpg, ui }));
      if (isChangeToKeep) userStore.setThemeChoice(heroId as string, { rpg, ui });
    }
  );
}
