import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";
import debug from "@/lib/utils/debug";

export default defineComponent<DefineUserActionComponent>({
  name: "world-plains",
  mixins: [ionic, userActions],

  ionViewDidEnter() {
    this.setActions(this.$options.name)
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    
    // Audio references
    const windAudio = ref<HTMLAudioElement | null>(null);
    const grasshopperInterval = ref<number | null>(null);
    
    // Initialize plains ambient sounds
    onMounted(() => {
      // Create gentle wind audio element for plains
      windAudio.value = new Audio();
      windAudio.value.src = "https://freesound.org/data/previews/346/346170_5121236-lq.mp3"; // Gentle wind sound
      windAudio.value.volume = 0.3;
      windAudio.value.loop = true;
      
      // Start playing wind sounds
      windAudio.value.play().catch(e => { debug.warn("Error playing wind sound:", e); });
      
      // Occasionally play grasshopper/cricket sounds
      grasshopperInterval.value = window.setInterval(() => {
        if (Math.random() > 0.7) {
          const cricketSound = new Audio();
          cricketSound.src = "https://freesound.org/data/previews/425/425556_7552848-lq.mp3"; // Cricket/grasshopper sound
          cricketSound.volume = 0.2 + (Math.random() * 0.2); // Random volume for variety
          cricketSound.play().catch(e => { debug.warn("Error playing cricket sound:", e); });
        }
      }, 8000);
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      if (windAudio.value) {
        windAudio.value.pause();
        windAudio.value = null;
      }
      
      if (grasshopperInterval.value) {
        clearInterval(grasshopperInterval.value);
        grasshopperInterval.value = null;
      }
    });

    const userActions = [
      {
        label: " Hometown",
        id: 'home-town',
        faIcon: "archway",
        side: "start",
        click($ev) {
          $ev.preventDefault()
          router.push({ name: 'home-town', params: { userId } })
        }
      },
      {
        label: "Wind Temple",
        id: "wind-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          const temple = "wind-temple"
          router.push({ name: "temple", params: { 
            userId, 
            temple,
            x: 2, 
            y: 5 
        } });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "start",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
      {
        label: "Pegasus Ranch",
        // label: "Zodiac Ranch",
        id: "pegasus-ranch",
        faIcon: "farm",
        side: "top",
        click() {
          const merchant = "pegasus-ranch"
          router.push({ name: "shop", params: { merchant } })
        },
      },
    ];
    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});