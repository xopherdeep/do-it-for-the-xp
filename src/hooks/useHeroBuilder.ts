import { computed, ref, type Ref } from "vue";
import { toastController } from "@ionic/vue";
import { rpgToastOptions } from "@/hooks/useToast";
import { useUserStore } from "@/lib/store/stores/user";
import { isHeroLook, type HeroLook } from "@/lib/hero-look/types";
import type { HandSlots } from "@/components/organisms/HeroModel/lookEditor";

/**
 * Opens the hero builder for a hero who is in the store (My Profile and the profile sheet; the Add Profile card
 * keeps its own draft because its hero does not exist yet). `look` is the hero's saved look only when it really is
 * one, so a hero who never built a look opens on the starter lineup. `save` stores the look and the snapshot on the
 * hero and says so. Destructure the return in `setup` so a template sees the refs unwrapped.
 */
export function useHeroBuilder(userId: Ref<string | undefined>) {
  const userStore = useUserStore();
  const isOpen = ref(false);

  const user = computed(() => (userId.value ? userStore.getUserById(userId.value) : undefined));

  const look = computed<HeroLook | undefined>(() => (isHeroLook(user.value?.look) ? user.value.look : undefined));
  const equipment = computed<HandSlots | null>(() => user.value?.equipment ?? null);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const save = async (nextLook: HeroLook, image?: string): Promise<void> => {
    const hasNoHero = !userId.value || !user.value;
    if (hasNoHero) return;
    userStore.setLook(userId.value as string, nextLook, image);
    const toast = await toastController.create(rpgToastOptions("Looking good!"));
    await toast.present();
  };

  return { isOpen, open, close, look, equipment, save };
}
