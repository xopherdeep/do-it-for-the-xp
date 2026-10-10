import { computed, defineComponent, ref } from "vue";
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, toastController } from "@ionic/vue";
import { arrowBack } from "ionicons/icons";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import { getLook } from "@/lib/hero-look/look";
import {
  DEFAULT_LOOK,
  FACE_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  LOOK_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  type HeroAnimation,
  type HeroLook,
} from "@/lib/hero-look/types";

/** A colour choice: `value` is what the look stores, `color` what the swatch paints */
export interface Swatch {
  value: string;
  color: string;
  name: string;
}

export interface ColorGroup {
  key: keyof HeroLook;
  label: string;
  swatches: Swatch[];
}

export interface LookTab {
  id: string;
  label: string;
  styles?: { key: keyof HeroLook; options: string[] };
  colors: ColorGroup[];
}

export const ANIMATIONS: { id: HeroAnimation; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "wave", label: "Wave" },
  { id: "walk", label: "Walk" },
  { id: "dance", label: "Dance" },
  { id: "victory", label: "Victory" },
];

const palette = (): Swatch[] => LOOK_COLORS.map((color) => ({ value: color, color, name: color }));
const skinTones = (): Swatch[] =>
  (Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[]).map((tone) => ({
    value: tone,
    color: SKIN_TONES[tone],
    name: tone,
  }));

export const TABS: LookTab[] = [
  { id: "body", label: "Body", colors: [{ key: "skin", label: "Skin tone", swatches: skinTones() }] },
  {
    id: "hair",
    label: "Hair",
    styles: { key: "hair", options: HAIR_STYLES },
    colors: [{ key: "hairColor", label: "Hair colour", swatches: palette() }],
  },
  {
    id: "face",
    label: "Face",
    styles: { key: "face", options: FACE_STYLES },
    colors: [{ key: "eyeColor", label: "Eye colour", swatches: palette() }],
  },
  {
    id: "outfit",
    label: "Outfit",
    styles: { key: "outfit", options: OUTFIT_STYLES },
    colors: [
      { key: "outfitColor", label: "Outfit colour", swatches: palette() },
      { key: "outfitAccent", label: "Trim colour", swatches: palette() },
    ],
  },
  {
    id: "hat",
    label: "Hat",
    styles: { key: "hat", options: HAT_STYLES },
    colors: [{ key: "hatColor", label: "Hat colour", swatches: palette() }],
  },
];

/** "ponytail" -> "Ponytail" */
export const styleLabel = (style: string): string => style.charAt(0).toUpperCase() + style.slice(1);

/** The first item in a hand slot: the equipment screen keeps items as plain data with a `faIcon` */
const handIcon = (slot: unknown): string | undefined => {
  const first = Array.isArray(slot) ? slot[0] : undefined;
  const icon = first && typeof first.faIcon === "string" ? first.faIcon : undefined;
  return icon || undefined;
};

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
    XpHeroModel,
  },
  setup(props) {
    const userStore = useUserStore();
    const user = computed(() => userStore.getUserById(props.userId));

    // The draft lives here until Save: leaving the page without saving discards it
    const saved = (): HeroLook => {
      const look = getLook(user.value);
      delete look.leftHand;
      delete look.rightHand;
      return look;
    };
    const draft = ref<HeroLook>(saved());
    const preview = ref<HeroAnimation>("idle");
    const tab = ref<string>(TABS[0].id);
    const saving = ref(false);
    const model = ref<{ snapshot: (size?: number) => string | Promise<string> } | null>(null);

    const current = computed(() => TABS.find((t) => t.id === tab.value) || TABS[0]);

    // The hands mirror the equipped items at render time; they are not part of what is saved
    const previewLook = computed<HeroLook>(() => {
      const equipment = user.value?.equipment;
      return {
        ...draft.value,
        leftHand: handIcon(equipment?.leftHand),
        rightHand: handIcon(equipment?.rightHand),
      };
    });

    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved()));

    const pick = (key: keyof HeroLook, value: string) => {
      draft.value = { ...draft.value, [key]: value };
    };

    const reset = () => {
      draft.value = { ...DEFAULT_LOOK };
    };

    const save = async () => {
      if (saving.value || !user.value) return;
      saving.value = true;
      try {
        // A snapshot that fails (no WebGL, say) must not lose the look: save it without a new picture
        let image: string | undefined;
        try {
          image = (await model.value?.snapshot(256)) || undefined;
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
      tab,
      current,
      previewLook,
      dirty,
      saving,
      model,
      pick,
      reset,
      save,
      styleLabel,
      ANIMATIONS,
      TABS,
      arrowBack,
    };
  },
});
