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
  name: "world-mountains",
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
    
    const fireAudio = ref<HTMLAudioElement | null>(null);
    
    // Initialize fire crackling sound
    onMounted(() => {
      // Create fire audio element
      fireAudio.value = new Audio();
      fireAudio.value.src = "https://freesound.org/data/previews/390/390421_7143452-lq.mp3";
      fireAudio.value.volume = 0.4;
      fireAudio.value.loop = true;
      
      // Start playing fire sound
      fireAudio.value.play().catch(error => {
        debug.log("Failed to play fire crackling audio:", error);
      });
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      if (fireAudio.value) {
        fireAudio.value.pause();
        fireAudio.value = null;
      }
    });

    const userActions = [
      {
        label: "Crystal Caverns",
        faIcon: "dungeon",
        side: "start",
        click() {
          const merchant = "crystal-caverns"
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
        label: "Fire Fortress",
        id: "fire-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          const temple = 'fire-temple'
          router.push({ name: "temple", params: { userId, temple } });
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