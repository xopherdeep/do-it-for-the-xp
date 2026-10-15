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

  const enter = () => {
    if (backgroundManager.isActiveFor(PAGE_ID)) backgroundManager.cleanupBackground();
    const common = { bg1: bg1.value, bg2: bg2.value, aspectRatio: BATTLE_ASPECT_RATIO, handleResize: true, page: PAGE_ID };
    if (canvasRef.value) {
      backgroundManager.initBackground({ canvasElement: canvasRef.value, ...common });
    } else {
      backgroundManager.initBackground({ canvasSelector: "canvas.battle-bg", ...common });
    }
  };

  /** A room-authored background beats whatever the beast would have chosen. */
  const lockLayers = (layers?: { bg1?: number; bg2?: number }) => {
    const hasNoRoomBackground = !layers || (layers.bg1 === undefined && layers.bg2 === undefined);
    if (hasNoRoomBackground) return;
    const { bg1: roomBg1, bg2: roomBg2 } = layers;
    const hasRoomBg1 = roomBg1 !== undefined;
    const hasRoomBg2 = roomBg2 !== undefined;
    if (hasRoomBg1) bg1.value = roomBg1;
    if (hasRoomBg2) bg2.value = roomBg2;
    locked = true;
  };

  const applyEnemy = async (enemy: Enemy | null) => {
    const canUseBeastBackground = enemy !== null && !locked;
    if (canUseBeastBackground) {
      const { bg1: beastBg1, bg2: beastBg2 } = enemy;
      const hasBeastBg1 = beastBg1 !== undefined;
      const hasBeastBg2 = beastBg2 !== undefined;
      if (hasBeastBg1) bg1.value = beastBg1;
      if (hasBeastBg2) bg2.value = beastBg2;
    }
    await nextTick();
    enter();
  };

  const collapse = (durationMs = 750) => backgroundManager.animateAspectRatio(0, durationMs);
  const cleanup = () => backgroundManager.cleanupBackground();

  onUnmounted(cleanup);

  return { canvasRef, bg1, bg2, enter, lockLayers, applyEnemy, collapse, cleanup };
};

export type BattleBackground = ReturnType<typeof useBattleBackground>;
