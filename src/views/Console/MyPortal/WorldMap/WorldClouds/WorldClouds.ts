import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-clouds",
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
    const thunderInterval = ref<number | null>(null);
    const thunderAudio = ref<HTMLAudioElement[]>([]);
    const rainAudio = ref<HTMLAudioElement | null>(null);
    const windAudio = ref<HTMLAudioElement | null>(null);
    
    // Initialize storm audio effects
    onMounted(() => {
      // Create multiple thunder sounds for variety
      const thunder1 = new Audio();
      thunder1.src = "https://freesound.org/data/previews/102/102806_1913395-lq.mp3";
      thunder1.volume = 0.7;
      
      const thunder2 = new Audio();
      thunder2.src = "https://freesound.org/data/previews/436/436741_8400208-lq.mp3";
      thunder2.volume = 0.6;
      
      const thunder3 = new Audio();
      thunder3.src = "https://freesound.org/data/previews/391/391950_7437340-lq.mp3";
      thunder3.volume = 0.65;
      
      thunderAudio.value = [thunder1, thunder2, thunder3];
      
      // Create rain ambience
      rainAudio.value = new Audio();
      rainAudio.value.src = "https://freesound.org/data/previews/346/346169_5121236-lq.mp3";
      rainAudio.value.volume = 0.4;
      rainAudio.value.loop = true;
      
      // Create wind ambience
      windAudio.value = new Audio();
      windAudio.value.src = "https://freesound.org/data/previews/131/131013_2363501-lq.mp3";
      windAudio.value.volume = 0.25;
      windAudio.value.loop = true;
      
      // Start playing ambient sounds
      rainAudio.value.play().catch(e => { /* Silent error handling */ });
      windAudio.value.play().catch(e => { /* Silent error handling */ });
      
      // Start thunder sound effects
      startThunderSounds();
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      stopAllSounds();
    });
    
    // Start thunder sound effects with varying intensities
    const startThunderSounds = () => {
      // Play thunder sounds at random intervals with varying intensities
      thunderInterval.value = window.setInterval(() => {
        if (Math.random() > 0.6) { // 40% chance of thunder on each interval
          const thunderIndex = Math.floor(Math.random() * thunderAudio.value.length);
          const thunder = thunderAudio.value[thunderIndex];
          
          // Create flash effect for loud thunders
          if (thunderIndex === 0) {
            const flash = document.createElement('div');
            flash.className = 'lightning-flash-overlay';
            document.body.appendChild(flash);
            
            // Remove flash effect after animation
            setTimeout(() => {
              document.body.removeChild(flash);
            }, 1000);
          }
          
          // Add slight volume variation
          thunder.volume = 0.5 + (Math.random() * 0.3);
          thunder.currentTime = 0;
          thunder.play().catch(e => { /* Silent error handling */ });
        }
      }, 5000 + Math.random() * 8000); // Random interval between 5-13 seconds
    };
    
    // Stop all sound effects
    const stopAllSounds = () => {
      if (thunderInterval.value) {
        window.clearInterval(thunderInterval.value);
        thunderInterval.value = null;
      }
      
      thunderAudio.value.forEach(audio => {
        audio.pause();
      });
      thunderAudio.value = [];
      
      if (rainAudio.value) {
        rainAudio.value.pause();
        rainAudio.value = null;
      }
      
      if (windAudio.value) {
        windAudio.value.pause();
        windAudio.value = null;
      }
    };

    const userActions = [
      {
        label: "Sky Temple",
        id: "sky-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          const temple = "sky-temple";
          router.push({
            name: "temple",
            params: {
              userId,
              temple,
              x: 3,
              y: 4,
            },
          });
        },
      },
      {
        label: "Cloud Market",
        id: "cloud-market",
        faIcon: "store",
        side: "top",
        click() {
          const merchant = "cloud-market";
          router.push({ name: "shop", params: { merchant } });
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
    ];
    return {
      userActions,
      user,
      userId,
      arrowBack
    };
  },
});