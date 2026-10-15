import { nextTick, onUnmounted, ref } from "vue";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import type { Enemy } from "@/lib/services/battle/BattleService";

const PAGE_ID = "battle-field";
const DEFAULT_BG1 = 219;
const DEFAULT_BG2 = 218;
const BATTLE_ASPECT_RATIO = 48;

/**
 * Owns the Earthbound-style animated canvas behind the arena.
 * Layer choice comes from the encounter (room override) or the enemy itself.
 */
export const useBattleBackground = () => {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const bg1 = ref(DEFAULT_BG1);
  const bg2 = ref(DEFAULT_BG2);
  let locked = false;

  const playEntrance = () => {
    if (backgroundManager.isActiveFor(PAGE_ID)) backgroundManager.cleanupBackground();
    const common = { bg1: bg1.value, bg2: bg2.value, aspectRatio: BATTLE_ASPECT_RATIO, handleResize: true, page: PAGE_ID };
    if (canvasRef.value) {
      backgroundManager.initBackground({ canvasElement: canvasRef.value, ...common });
    } else {
      backgroundManager.initBackground({ canvasSelector: "canvas.battle-bg", ...common });
    }
  };

  /** A room-authored background beats whatever the beast would have chosen. */
  const setLockedLayers = (layers?: { bg1?: number; bg2?: number }) => {
    const hasNoRoomBackground = !layers || (layers.bg1 === undefined && layers.bg2 === undefined);
    if (hasNoRoomBackground) return;
    if (layers.bg1 !== undefined) bg1.value = layers.bg1;
    if (layers.bg2 !== undefined) bg2.value = layers.bg2;
    locked = true;
  };

  const applyEnemy = async (enemy: Enemy | null) => {
    const canUseBeastBackground = enemy !== null && !locked;
    if (canUseBeastBackground) {
      if (enemy.bg1 !== undefined) bg1.value = enemy.bg1;
      if (enemy.bg2 !== undefined) bg2.value = enemy.bg2;
    }
    await nextTick();
    playEntrance();
  };

  const playCollapse = (durationMs = 750) => backgroundManager.animateAspectRatio(0, durationMs);
  const disposeBackground = () => backgroundManager.cleanupBackground();

  onUnmounted(disposeBackground);

  return { canvasRef, setLockedLayers, applyEnemy, playCollapse };
};

export type BattleBackground = ReturnType<typeof useBattleBackground>;
