import { computed } from "vue";
import { canRestoreHere } from "@/lib/services/core/restoreAccess";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";

/**
 * Who is signed in on this device, for Settings > General: the profile, whether this is a kid phone, and whether the
 * profile may change the family's settings or restore a backup. It asks the user and family stores for itself, so the
 * page keeps to what it edits: the start-up choices, backups, the asset pack and the language.
 */
export function useSignedInProfile() {
  const userStore = useUserStore();
  const family = useFamilyStore();
  // A kid phone (family sync spec, section 7) has no Backup & Restore
  const isKidMode = computed(() => family.isKidMode);
  const currentHeroId = computed(() => String(userStore.currentUser?.id || ""));
  // The signed-in profile comes from `users`: `currentUser` is only the login copy, with no name and a possibly
  // stale isAdult.
  const profile = computed(() => {
    const signedInId = userStore.currentUser?.id;
    return signedInId ? userStore.users[String(signedInId)] : undefined;
  });
  // Whoever may open the Game Master area may change the family's settings, such as the first day of the week
  const canManage = computed(() => canManageFamily(userStore));
  // Restore is for a Game Master, or for anybody while the device has no profile yet
  const canRestore = computed(() => canRestoreHere(userStore));

  return { isKidMode, currentHeroId, profile, canManage, canRestore };
}
