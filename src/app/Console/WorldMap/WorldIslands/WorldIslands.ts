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

    // Initialize island ambient sounds
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
    });

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