import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-mountains",
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
    
    const fireAudio = ref<HTMLAudioElement | null>(null);
    
    // Initialize fire crackling sound
    onMounted(() => {
      // Create fire audio element
      fireAudio.value = new Audio();
      fireAudio.value.src = "https://freesound.org/data/previews/390/390421_7143452-lq.mp3";
      fireAudio.value.volume = 0.4;
      fireAudio.value.loop = true;
      
      // Start playing fire sound
      fireAudio.value.play().catch(e => { /* Silent error handling */ });
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
        side: "top",
        click() {
          const merchant = "crystal-caverns"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Fire Fortress",
        id: "fire-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          const temple = 'fire-temple'
          router.push({ name: "temple", params: { userId, temple } });
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
      arrowBack,
    };
  },
});