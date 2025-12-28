import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";
import debug from "@/lib/utils/debug";

export default defineComponent<DefineUserActionComponent>({
  name: "world-forest",
  mixins: [ionic, userActions],

  ionViewDidEnter() {
    this.setActions( this.$options.name )
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));
    
    const forestAudio = ref<HTMLAudioElement | null>(null);
    
    // Initialize forest ambient sounds
    onMounted(() => {
      // Create forest audio element
      forestAudio.value = new Audio();
      forestAudio.value.src = "https://freesound.org/data/previews/617/617464_5674468-lq.mp3"; // Forest ambience sound
      forestAudio.value.volume = 0.4;
      forestAudio.value.loop = true;
      
      // Start playing forest sounds
      forestAudio.value.play().catch(error => {
        debug.log("Failed to play forest ambient audio:", error);
      });
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      if (forestAudio.value) {
        forestAudio.value.pause();
        forestAudio.value = null;
      }
    });
    
    const userActions = [
      {
        label: "Hermit's Tent",
        faIcon: "campground",
        side: "start",
        click() {
          const merchant = "hermits-tent"
          router.push({ name: "shop", params: { merchant }})
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
        label: "Forest Temple",
        id: "forest-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          const temple = "forest-temple"
          router.push({ 
            name: "temple", 
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