import { computed, ref } from "vue";
import { play$fx } from "@/assets/fx";
import { DEFAULT_HERO_SKIN, isHeroSkin, type HeroSkin } from "@/lib/services/profile/heroSkin";
import { themeOf } from "@/lib/services/profile/heroTheme";
import { useGameStore } from "@/lib/store/stores/game";
import { useProStore } from "@/lib/store/stores/pro";
import { GAME_STYLE_NAMES, GAME_STYLES, isProGameStyle, UI_STYLES } from "@/lib/utils/gameStyle";
import { SKIN_CHOICES } from "./formOptions";

/**
 * What the new-hero wizard's Style step holds: Retro or Modern, the game style and the menu sounds. The game style and
 * sounds start as the device's current choice. A Pro game style without Pro opens the upsell and the pick stays put.
 */
export function useHeroStyleChoice() {
  const gameStore = useGameStore();
  const pro = useProStore();
  pro.init().catch(() => undefined);

  const skin = ref<HeroSkin>(DEFAULT_HERO_SKIN);
  const rpgStyle = ref(gameStore.theme.rpg);
  const uiSounds = ref(gameStore.theme.ui);

  /** Lay a stored hero's choices over the form (an old profile holds none and leaves the starting ones) */
  const loadStyleFrom = (profile: { skin?: unknown; themeChoice?: unknown }): void => {
    if (isHeroSkin(profile.skin)) skin.value = profile.skin;
    const saved = themeOf(profile);
    if (saved) {
      rpgStyle.value = saved.rpg;
      uiSounds.value = saved.ui;
    }
  };

  const pickSkin = (value: string): void => {
    if (!isHeroSkin(value)) return;
    play$fx("select");
    skin.value = value;
  };
  const pickGameStyle = async (value: string): Promise<void> => {
    const isKnown = (GAME_STYLES as readonly string[]).includes(value);
    if (!isKnown) return;
    const isLocked = isProGameStyle(value) && !(await pro.requirePro("gameStyles"));
    if (isLocked) return;
    play$fx("select");
    rpgStyle.value = value;
  };
  const pickUiSounds = (value: string): void => {
    const isKnown = (UI_STYLES as readonly string[]).includes(value);
    if (!isKnown) return;
    play$fx("select");
    uiSounds.value = value;
  };

  /** Everything the picker shows and the hero record saves */
  const styleChoice = computed(() => ({
    skin: skin.value,
    rpg: rpgStyle.value,
    ui: uiSounds.value,
    isPro: pro.isPro,
  }));
  /** The one line the Ready step shows */
  const styleSummary = computed(() => {
    const card = SKIN_CHOICES.find((choice) => choice.key === skin.value);
    const gameStyle = GAME_STYLE_NAMES[rpgStyle.value as keyof typeof GAME_STYLE_NAMES];
    return card ? { icon: card.icon, text: `${card.label}, ${gameStyle}` } : null;
  });

  /** A tap on one of the picker's cards: which list, which card */
  const setStyleChoice = (pick: { kind: "skin" | "style" | "sounds"; key: string }): void => {
    const picker = { skin: pickSkin, style: pickGameStyle, sounds: pickUiSounds }[pick.kind];
    void picker(pick.key);
  };

  return { styleChoice, styleSummary, setStyleChoice, loadStyleFrom };
}
