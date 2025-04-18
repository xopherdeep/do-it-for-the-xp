import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-desert",
  mixins: [ionic, userActions],
  ionViewDidEnter() {
    this.setActions( this.$options.name )
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    
    const windInterval = ref<number | null>(null);
    const windAudio = ref<HTMLAudioElement | null>(null);
    
    // Initialize wind sound
    onMounted(() => {
      // Create wind audio element
      windAudio.value = new Audio();
      windAudio.value.src = "https://freesound.org/data/previews/13/13283_57356-lq.mp3";
      windAudio.value.volume = 0.4;
      windAudio.value.loop = true;
      
      // Start playing wind sound
      windAudio.value.play().catch(e => console.log("Audio play failed:", e));
      
      // Occasionally increase wind intensity
      windInterval.value = window.setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance of wind gust
          const originalVolume = windAudio.value?.volume || 0.4;
          
          // Increase volume for wind gust
          if (windAudio.value) {
            windAudio.value.volume = Math.min(0.8, originalVolume * 1.5);
            
            // Return to normal volume after 2 seconds
            setTimeout(() => {
              if (windAudio.value) {
                windAudio.value.volume = originalVolume;
              }
            }, 2000);
          }
        }
      }, 10000); // Check every 10 seconds
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      if (windInterval.value) {
        window.clearInterval(windInterval.value);
        windInterval.value = null;
      }
      if (windAudio.value) {
        windAudio.value.pause();
        windAudio.value = null;
      }
    });

    const userActions = [
      {
        // label: "Oasis",
        label: "Pond of Life",
        faIcon: "island-tropical",
        side: "top",
        click() {
          const merchant = "pond-of-life"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Sun Pyramid",
        id: "sun-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          const temple = 'sun-temple'
          router.push({ 
            name: "temple", 
            params: { 
              userId,
              temple
            } 
          });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "start",
        click() {
          const temple = 'sun-temple'
          router.push({ 
            name: "world-map", 
            params: { 
              userId, 
              temple
             } 
          });
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