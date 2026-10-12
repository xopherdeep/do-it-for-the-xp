import { computed, defineComponent, ref } from "vue";
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, toastController } from "@ionic/vue";
import { arrowBack } from "ionicons/icons";
import XpLookEditor from "@/components/organisms/HeroModel/XpLookEditor.vue";
import { withoutHands } from "@/components/organisms/HeroModel/lookEditor";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import { getLook } from "@/lib/hero-look/look";
import { DEFAULT_LOOK, type HeroAnimation, type HeroLook } from "@/lib/hero-look/types";

export const ANIMATIONS: { id: HeroAnimation; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "wave", label: "Wave" },
  { id: "walk", label: "Walk" },
  { id: "dance", label: "Dance" },
  { id: "victory", label: "Victory" },
];

export default defineComponent({
  name: "my-look",
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  components: {
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    XpLookEditor,
  },
  setup(props) {
    const userStore = useUserStore();
    const user = computed(() => userStore.getUserById(props.userId));

    // The draft lives here until Save: leaving the page without saving discards it
    const saved = (): HeroLook => withoutHands(getLook(user.value));
    const draft = ref<HeroLook>(saved());
    const preview = ref<HeroAnimation>("idle");
    const saving = ref(false);
    const editor = ref<{ snapshot: (size?: number) => string | Promise<string> | undefined } | null>(null);

    // The editor draws the hands from the equipped items; they are not part of what is saved
    const equipment = computed(() => user.value?.equipment);

    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved()));

    const reset = () => {
      draft.value = { ...DEFAULT_LOOK };
    };

    const save = async () => {
      const isSaveBlocked = saving.value || !user.value;
      if (isSaveBlocked) return;
      saving.value = true;
      try {
        // A snapshot that fails (no WebGL, say) must not lose the look: save it without a new picture
        let image: string | undefined;
        try {
          image = (await editor.value?.snapshot(256)) || undefined;
        } catch {
          image = undefined;
        }
        userStore.setLook(props.userId, draft.value, image);
        play$fx("yes");
        const toast = await toastController.create({
          message: "Looking good!",
          duration: 2000,
          position: "top",
          cssClass: "rpg-toast",
        });
        await toast.present();
      } finally {
        saving.value = false;
      }
    };

    return {
      user,
      draft,
      preview,
      equipment,
      dirty,
      saving,
      editor,
      reset,
      save,
      ANIMATIONS,
      arrowBack,
    };
  },
});
