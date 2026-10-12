import { computed, onMounted, onBeforeUnmount, ref } from "vue";

export interface RoamBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export const useMonsterRoam = (bounds: RoamBounds = {}) => {
  const minX = bounds.minX ?? 28;
  const maxX = bounds.maxX ?? 72;
  const minY = bounds.minY ?? 38;
  const maxY = bounds.maxY ?? 64;

  const posX = ref(50);
  const posY = ref(52);
  const facingYaw = ref(0);
  const isHovered = ref(false);
  const isMoving = ref(false);

  let roamTimer: ReturnType<typeof setTimeout> | undefined;

  const getRandomTarget = () => {
    const nextX = Math.round(minX + Math.random() * (maxX - minX));
    const nextY = Math.round(minY + Math.random() * (maxY - minY));
    return { nextX, nextY };
  };

  const stepRoam = () => {
    if (isHovered.value) {
      facingYaw.value = 0;
      roamTimer = setTimeout(stepRoam, 1600);
      return;
    }

    const { nextX, nextY } = getRandomTarget();
    const dx = nextX - posX.value;
    const dy = nextY - posY.value;

    // Calculate facing angle for 3D NPC navigation
    let targetYaw = 0;
    if (Math.abs(dx) >= 3) {
      targetYaw = dx > 0 ? 0.6 : -0.6;
    } else if (dy > 3) {
      targetYaw = 0;
    } else if (dy < -3) {
      targetYaw = (dx >= 0 ? 1 : -1) * 2.2;
    }

    facingYaw.value = targetYaw;
    isMoving.value = true;
    posX.value = nextX;
    posY.value = nextY;

    // Movement duration: ~2.4s. When arriving, face forward like an attentive NPC
    const moveDuration = 2400;
    roamTimer = setTimeout(() => {
      isMoving.value = false;
      roamTimer = setTimeout(() => {
        if (!isMoving.value && !isHovered.value) {
          facingYaw.value = 0;
        }
        const dwell = 2000 + Math.random() * 2600;
        roamTimer = setTimeout(stepRoam, dwell);
      }, 600);
    }, moveDuration);
  };

  onMounted(() => {
    roamTimer = setTimeout(stepRoam, 1000);
  });

  onBeforeUnmount(() => {
    if (roamTimer) clearTimeout(roamTimer);
  });

  const wrapperStyle = computed(() => ({
    position: "absolute" as const,
    left: `${posX.value}%`,
    top: `${posY.value}%`,
    transform: "translate(-50%, -50%)",
    transition: "left 2.4s cubic-bezier(0.25, 1, 0.5, 1), top 2.4s cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: 90,
  }));

  return {
    posX,
    posY,
    facingYaw,
    isHovered,
    isMoving,
    wrapperStyle,
  };
};
