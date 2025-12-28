import { defineComponent as dC } from "vue";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import debug from "@/lib/utils/debug";
import { IonPage, IonContent, onIonViewDidEnter } from "@ionic/vue";

import WeatherFX from '@/components/organisms/WeatherFX/WeatherFX.vue';

export default dC({
  name: "world-islands",
  components: {
    WeatherFX,
    IonPage,
    IonContent
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const { setActions } = useUserActions();

    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));

    const oceanAudio = ref<HTMLAudioElement | null>(null);
    const seagullInterval = ref<number | null>(null);
    const birdTimers = ref<(number | NodeJS.Timeout)[]>([]);
    const activeBirds = ref<HTMLElement[]>([]);

    // Initialize island ambient sounds and bird landing animations
    onMounted(() => {
      // Create ocean waves audio
      oceanAudio.value = new Audio();
      oceanAudio.value.src = "https://freesound.org/data/previews/47/47389_173475-lq.mp3"; // Ocean waves sound
      oceanAudio.value.volume = 0.3;
      oceanAudio.value.loop = true;

      // Start playing ocean sounds
      oceanAudio.value.play().catch(error => {
        debug.log("Failed to play ocean waves audio:", error);
      });

      // Play occasional seagull sounds
      seagullInterval.value = window.setInterval(() => {
        if (Math.random() > 0.6) { // 40% chance of seagull
          const seagull = new Audio();
          seagull.src = "https://freesound.org/data/previews/19/19271_32633-lq.mp3"; // Seagull sound
          seagull.volume = 0.2;
          seagull.play().catch(error => {
            debug.log("Failed to play seagull audio:", error);
          });
        }
      }, 20000); // Check every 20 seconds

      // Get all bird elements
      const birdElements = document.querySelectorAll('.bird') as NodeListOf<HTMLElement>;
      activeBirds.value = Array.from(birdElements);

      // Initialize birds with random flight paths
      initializeBirds();

      // Periodically send birds on new flights
      setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance to send a new bird
          const availableBirds = activeBirds.value.filter(bird => !bird.classList.contains('flying'));
          if (availableBirds.length > 0) {
            const randomBirdIndex = Math.floor(Math.random() * availableBirds.length);
            sendBirdOnRandomFlight(availableBirds[randomBirdIndex]);
          }
        }
      }, 5000);
    });

    // Initialize birds with staggered random flights
    const initializeBirds = () => {
      activeBirds.value.forEach((bird, index) => {
        // Position birds at random starting points
        const startX = Math.random() * 80 + 10; // 10% to 90% horizontally
        bird.style.left = `${startX}%`;
        bird.style.top = '-50px';

        // Stagger initial flights
        setTimeout(() => {
          sendBirdOnRandomFlight(bird);
        }, index * 2000 + Math.random() * 3000); // Stagger by index plus some randomness
      });
    };

    // Send a bird on a random flight path
    const sendBirdOnRandomFlight = (bird: HTMLElement) => {
      // Remove any existing classes and inline styles
      bird.className = bird.className.replace(/\bflying\b|\blanded\b/g, '').trim();
      bird.classList.add('flying');

      // Generate random flight control points
      const flightDuration = Math.random() * 10000 + 15000; // 15-25 seconds
      const landingDuration = Math.random() * 5000 + 3000; // 3-8 seconds

      // Random landing point (x,y coordinates as percentages)
      // Adjusted to ensure birds appear in the visible part of the screen
      const landX = Math.random() * 80 + 10; // 10% to 90% horizontally
      const landY = Math.random() * 40 + 30; // 30% to 70% vertically - more centered in viewport

      // Random control points for bezier curve - adjusted to keep birds in viewport
      const cp1x = Math.random() * 100;
      const cp1y = Math.random() * 40 + 20; // Keep these in the upper middle of screen
      const cp2x = Math.random() * 100;
      const cp2y = Math.random() * 30 + landY - 20; // Keep near landing position

      // Set flight path as custom properties
      bird.style.setProperty('--land-x', `${landX}%`);
      bird.style.setProperty('--land-y', `${landY}%`);
      bird.style.setProperty('--cp1-x', `${cp1x}%`);
      bird.style.setProperty('--cp1-y', `${cp1y}%`);
      bird.style.setProperty('--cp2-x', `${cp2x}%`);
      bird.style.setProperty('--cp2-y', `${cp2y}%`);
      bird.style.setProperty('--flight-duration', `${flightDuration}ms`);

      // Adjust wing flapping speed based on phase of flight
      const wingElements = bird.querySelectorAll('.wing') as NodeListOf<HTMLElement>;
      wingElements.forEach(wing => {
        wing.style.animationDuration = '0.2s'; // Fast flapping during flight
      });

      // Schedule landing
      const landingTimer = setTimeout(() => {
        bird.classList.add('landed');

        // Slow down wing flapping when landed
        wingElements.forEach(wing => {
          wing.style.animationDuration = '1.2s'; // Slower flapping when landed
        });

        // Schedule takeoff after landing duration
        const takeoffTimer = setTimeout(() => {
          bird.classList.remove('landed');

          // Speed up wing flapping for takeoff
          wingElements.forEach(wing => {
            wing.style.animationDuration = '0.15s'; // Very fast flapping for takeoff
          });

          // Schedule end of flight
          const exitFlightTimer = setTimeout(() => {
            bird.classList.remove('flying');

            // After a pause, maybe send on another flight
            const nextFlightTimer = setTimeout(() => {
              if (Math.random() > 0.3) { // 70% chance to fly again
                sendBirdOnRandomFlight(bird);
              }
            }, Math.random() * 5000 + 2000);

            birdTimers.value.push(nextFlightTimer);
          }, 5000);

          birdTimers.value.push(exitFlightTimer);
        }, landingDuration);

        birdTimers.value.push(takeoffTimer);
      }, flightDuration * 0.6); // Land after 60% of the flight time

      birdTimers.value.push(landingTimer);
    };

    // Clean up when component is unmounted
    onUnmounted(() => {
      if (oceanAudio.value) {
        oceanAudio.value.pause();
        oceanAudio.value = null;
      }

      if (seagullInterval.value) {
        window.clearInterval(seagullInterval.value);
        seagullInterval.value = null;
      }

      // Clear all bird timers - Fixed to handle both number and Timeout types
      birdTimers.value.forEach(timer => {
        if (typeof timer === 'number') {
          window.clearTimeout(timer);
        } else {
          clearTimeout(timer);
        }
      });
      birdTimers.value = [];
    });

    const userActions = [
      {
        label: "Wrecked Ship",
        faIcon: "ship",
        side: "start",
        click() {
          const merchant = "wrecked-ship"
          router.push({ name: "shop", params: { merchant } })
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "top",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
      {
        label: "Water Temple",
        id: "water-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          const temple = 'water-temple'
          router.push({ name: "temple", params: { userId, temple } });
        },
      },
    ];

    onIonViewDidEnter(() => {
      setActions("world-islands", userActions);
    })

    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});