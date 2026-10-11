import { computed, onMounted, onBeforeUnmount, ref } from "vue";

export interface RoamBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export const useMonsterRoam = (bounds: RoamBounds = {}, enableFlip = false) => {
  const minX = bounds.minX ?? 25;
  const maxX = bounds.maxX ?? 75;
  const minY = bounds.minY ?? 40;
  const maxY = bounds.maxY ?? 68;

  const posX = ref(50);
  const posY = ref(54);
  const facing = ref(1);
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
      roamTimer = setTimeout(stepRoam, 2000);
      return;
    }

    const { nextX, nextY } = getRandomTarget();
    facing.value = nextX >= posX.value ? 1 : -1;
    isMoving.value = true;
    posX.value = nextX;
    posY.value = nextY;

    // Movement duration is ~2.2s, schedule next waypoint after brief pause
    const dwell = 2600 + Math.random() * 2200;
    roamTimer = setTimeout(() => {
      isMoving.value = false;
      roamTimer = setTimeout(stepRoam, 800 + Math.random() * 1200);
    }, dwell);
  };

  onMounted(() => {
    // Initial wander after brief entrance delay
    roamTimer = setTimeout(stepRoam, 1200);
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

  const modelStyle = computed(() =>
    enableFlip
      ? {
          transform: `scaleX(${facing.value})`,
          transition: "transform 0.3s ease",
        }
      : {}
  );

  return {
    posX,
    posY,
    facing,
    isHovered,
    isMoving,
    wrapperStyle,
    modelStyle,
  };
};
