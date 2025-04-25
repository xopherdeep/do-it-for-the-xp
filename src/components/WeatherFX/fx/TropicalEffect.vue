<template>
  <div
    class="tropical-effect"
    :class="`intensity-${intensity}`"
  >
    <!-- Improved sunrays implementation -->
    <div class="sunrays-container">
      <div
        v-for="i in 6"
        :key="`sunray-${i}`"
        class="sunray"
        :class="`sunray-${i}`"
        :style="{
          '--angle': `${(i - 3.5) * 10}deg`,
          '--delay': `${i * 2}s`,
          '--duration': `${15 + i * 2}s`,
          '--opacity': 0.6 - (Math.abs(i - 3.5) * 0.07)
        }"
      >
      </div>
    </div>

    <!-- Light sparkles on water -->
    <div class="sparkles-container">
      <div
        v-for="i in 15"
        :key="`sparkle-${i}`"
        class="sparkle"
        :style="{
          '--x': `${Math.random() * 100}%`,
          '--y': `${50 + Math.random() * 40}%`,
          '--size': `${Math.random() * 4 + 2}px`,
          '--delay': `${Math.random() * 10}s`,
          '--duration': `${Math.random() * 5 + 3}s`
        }"
      >
      </div>
    </div>

    <!-- Flying birds with optimized implementation -->
    <div class="birds-container">
      <div
        v-for="i in birdCount"
        :key="`bird-${i}`"
        class="bird"
        ref="birdRefs"
        :class="{ flying: activeBirds[i - 1]?.flying, landed: activeBirds[i - 1]?.landed }"
        :style="{
          '--land-x': activeBirds[i - 1]?.landX || '50%',
          '--land-y': activeBirds[i - 1]?.landY || '50%',
          '--flight-duration': `${activeBirds[i - 1]?.flightDuration || 20000}ms`
        }"
      >
        <div class="bird-body"></div>
        <div class="wing wing-left"></div>
        <div class="wing wing-right"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';

  // Define a type that can handle both browser and Node.js timer IDs
  type TimerId = number | ReturnType<typeof setTimeout>;

  interface BirdState {
    flying: boolean;
    landed: boolean;
    landX: string;
    landY: string;
    flightDuration: number;
    timers: TimerId[];
  }

  export default defineComponent({
    name: 'tropical-effect',
    props: {
      intensity: {
        type: Number,
        default: 5,
        validator: (value: number) => value >= 0 && value <= 10
      },
      customBirdCount: {
        type: Number,
        default: 0
      }
    },
    emits: ['effect-loaded'],
    setup(props, { emit }) {
      // Calculate bird count based on intensity
      const birdCount = ref(props.customBirdCount || Math.min(Math.max(Math.floor(props.intensity / 2), 1), 6));
      const birdRefs = ref<HTMLElement[]>([]);
      const activeBirds = ref<BirdState[]>([]);
      const allTimers = ref<TimerId[]>([]);

      // Initialize bird states
      onMounted(() => {
        nextTick(() => {
          initializeBirds();
          emit('effect-loaded');
        });
      });

      // Initialize birds with staggered flights
      const initializeBirds = () => {
        // Reset bird states
        activeBirds.value = Array(birdCount.value).fill(null).map(() => ({
          flying: false,
          landed: false,
          landX: '50%',
          landY: '50%',
          flightDuration: 20000,
          timers: []
        }));

        // Get bird elements
        if (birdRefs.value && birdRefs.value.length) {
          // Stagger bird flight starts
          birdRefs.value.forEach((bird, index) => {
            const timer = setTimeout(() => {
              sendBirdOnRandomFlight(index);
            }, index * 2500 + Math.random() * 3000);

            allTimers.value.push(timer);
          });
        }
      };

      // Send a bird on a random flight path
      const sendBirdOnRandomFlight = (birdIndex: number) => {
        if (birdIndex >= activeBirds.value.length) return;

        const bird = activeBirds.value[birdIndex];

        // Clear any existing timers for this bird
        bird.timers.forEach(timer => {
          if (typeof timer === 'number') {
            window.clearTimeout(timer);
          } else {
            clearTimeout(timer);
          }
        });
        bird.timers = [];

        // Update bird state
        bird.flying = true;
        bird.landed = false;

        // Generate random flight params
        const flightDuration = Math.random() * 10000 + 15000; // 15-25 seconds
        const landingDuration = Math.random() * 5000 + 3000; // 3-8 seconds

        // Random landing coordinates
        const landX = `${Math.random() * 80 + 10}%`; // 10% to 90% horizontally
        const landY = `${Math.random() * 40 + 30}%`; // 30% to 70% vertically

        // Update state
        bird.landX = landX;
        bird.landY = landY;
        bird.flightDuration = flightDuration;

        // Schedule landing
        const landingTimer = setTimeout(() => {
          bird.landed = true;

          // Schedule takeoff after landing duration
          const takeoffTimer = setTimeout(() => {
            bird.landed = false;

            // Schedule end of flight
            const exitFlightTimer = setTimeout(() => {
              bird.flying = false;

              // After a pause, maybe send on another flight
              const nextFlightTimer = setTimeout(() => {
                if (Math.random() > 0.2) { // 80% chance to fly again
                  sendBirdOnRandomFlight(birdIndex);
                } else {
                  // Small chance to wait longer before next flight
                  const extendedPauseTimer = setTimeout(() => {
                    sendBirdOnRandomFlight(birdIndex);
                  }, Math.random() * 10000 + 5000);

                  bird.timers.push(extendedPauseTimer);
                  allTimers.value.push(extendedPauseTimer);
                }
              }, Math.random() * 3000 + 1000);

              bird.timers.push(nextFlightTimer);
              allTimers.value.push(nextFlightTimer);
            }, 5000);

            bird.timers.push(exitFlightTimer);
            allTimers.value.push(exitFlightTimer);
          }, landingDuration);

          bird.timers.push(takeoffTimer);
          allTimers.value.push(takeoffTimer);
        }, flightDuration * 0.6); // Land after 60% of the flight time

        bird.timers.push(landingTimer);
        allTimers.value.push(landingTimer);
      };

      // Clean up
      onUnmounted(() => {
        // Clear all timers
        allTimers.value.forEach(timer => {
          if (typeof timer === 'number') {
            window.clearTimeout(timer);
          } else {
            clearTimeout(timer);
          }
        });
      });

      return {
        birdCount,
        birdRefs,
        activeBirds
      };
    }
  });
</script>

<style lang="scss">
  .tropical-effect {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;

    // Intensity modifiers
    &.intensity-1,
    &.intensity-2 {
      .sunray {
        opacity: 0.3;
      }

      .sparkle {
        opacity: 0.3;
      }
    }

    &.intensity-9,
    &.intensity-10 {
      .sunray {
        opacity: 0.8;
      }

      .sparkle {
        opacity: 0.9;
      }
    }

    // Improved sunrays
    .sunrays-container {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .sunray {
      position: absolute;
      top: -50%;
      left: 50%;
      width: 40px;
      height: 200%;
      background: linear-gradient(to bottom, rgba(255, 255, 220, 0.8) 0%, rgba(255, 255, 220, 0) 90%);
      transform-origin: top center;
      filter: blur(5px);
      opacity: var(--opacity, 0.6);
      animation:
        sunray-rotate var(--duration, 15s) infinite ease-in-out,
        sunray-flicker calc(var(--duration, 15s) * 0.7) infinite ease-in-out;
      animation-delay: var(--delay, 0s), calc(var(--delay, 0s) + 1s);
      transform: rotate(var(--angle, 0deg));

      &.sunray-3,
      &.sunray-4 {
        width: 60px; // Middle sunrays are wider
      }
    }

    @keyframes sunray-flicker {

      0%,
      100% {
        opacity: var(--opacity, 0.6);
      }

      50% {
        opacity: calc(var(--opacity, 0.6) + 0.2);
      }
    }

    @keyframes sunray-rotate {
      0% {
        transform: rotate(var(--angle, 0deg));
      }

      33% {
        transform: rotate(calc(var(--angle, 0deg) - 4deg));
      }

      66% {
        transform: rotate(calc(var(--angle, 0deg) + 4deg));
      }

      100% {
        transform: rotate(var(--angle, 0deg));
      }
    }

    // Water sparkles
    .sparkles-container {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 2;
    }

    .sparkle {
      position: absolute;
      width: var(--size, 3px);
      height: var(--size, 3px);
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      left: var(--x, 50%);
      top: var(--y, 50%);
      transform: translate(-50%, -50%);
      opacity: 0;
      filter: blur(1px);
      animation: sparkle-twinkle var(--duration, 4s) infinite ease-in-out;
      animation-delay: var(--delay, 0s);
    }

    @keyframes sparkle-twinkle {

      0%,
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.3);
      }

      50% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    // Birds with improved animations
    .birds-container {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 3;
    }

    .bird {
      position: absolute;
      width: 16px;
      height: 8px;
      z-index: 3;
      top: 10%;
      left: 50%;
      transform: translate(-50%, 0) scale(0.3);
      opacity: 0.5;

      &.flying {
        animation: bird-flight var(--flight-duration, 20000ms) cubic-bezier(0.4, 0, 0.2, 1) forwards;

        .wing {
          animation-duration: 0.2s;
        }

        &.landed .wing {
          animation-duration: 1.2s;
        }
      }

      .bird-body {
        position: absolute;
        width: 6px;
        height: 3px;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        top: 2px;
        left: 5px;
      }

      .wing {
        position: absolute;
        width: 14px;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 50% 50% 0 0;

        &.wing-left {
          top: 0;
          left: -5px;
          transform-origin: right center;
          animation: wing-flap-left ease-in-out infinite;
        }

        &.wing-right {
          top: 0;
          left: 8px;
          transform-origin: left center;
          animation: wing-flap-right ease-in-out infinite;
        }
      }
    }

    @keyframes wing-flap-left {

      0%,
      100% {
        transform: rotate(0deg);
      }

      50% {
        transform: rotate(40deg);
      }
    }

    @keyframes wing-flap-right {

      0%,
      100% {
        transform: rotate(0deg);
      }

      50% {
        transform: rotate(-40deg);
      }
    }

    @keyframes bird-flight {
      0% {
        transform: translateX(-20%) translateY(0) scale(0.3);
        opacity: 0.5;
      }

      10% {
        transform: translateX(-10%) translateY(30px) scale(0.6);
        opacity: 1;
      }

      30%,
      60% {
        transform:
          translateX(calc(var(--land-x) - 50%)) translateY(var(--land-y)) scale(1);
      }

      75% {
        transform:
          translateX(calc(var(--land-x) - 30%)) translateY(calc(var(--land-y) - 50px)) scale(0.8);
      }

      90% {
        transform:
          translateX(calc(var(--land-x) - 10%)) translateY(calc(var(--land-y) - 100px)) scale(0.5);
        opacity: 1;
      }

      100% {
        transform:
          translateX(calc(var(--land-x) + 30%)) translateY(10%) scale(0.3);
        opacity: 0.5;
      }
    }
  }
</style>