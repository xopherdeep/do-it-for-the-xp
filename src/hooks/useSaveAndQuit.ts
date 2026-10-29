import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { play$fx } from "@/assets/fx";
import { goAfterSignOut } from "@/router/signOutRoute";

/**
 * The Save & Quit flow, one place for the avatar menu and My Home.
 * Confirming signs the hero out and walks to the sign-out screen right away: it never waits for the
 * modal's dismiss event, so the sign-out cannot be lost when the modal goes away early.
 * Sounds: openMenu when the question opens, select on Save & Quit; Cancel, the close button and the
 * backdrop play their own "no" inside the modal, so closing here stays silent (no double sounds).
 */
export const useSaveAndQuit = () => {
  const router = useRouter();
  const userStore = useUserStore();
  const isOpen = ref(false);

  const open = () => {
    if (isOpen.value) return;
    play$fx("openMenu");
    isOpen.value = true;
  };

  /** The modal reports `close` for Cancel, the X, the backdrop and after a confirm; only the first three matter */
  const cancel = () => {
    isOpen.value = false;
  };

  const confirm = async () => {
    const isAlreadyQuitting = !isOpen.value;
    if (isAlreadyQuitting) return; // a second tap on the button
    isOpen.value = false;
    play$fx("select");
    await nextTick(); // let the modal start closing before the page changes under it
    // Signing out rests the hero's turn (the sync store watches who is signed in): what waits goes up first
    userStore.logoutUser();
    await goAfterSignOut(router);
  };

  return { isOpen, open, cancel, confirm };
};
