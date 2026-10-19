import { computed } from "vue";
import { useIonRouter } from "@ionic/vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useBackupRestore } from "@/hooks/useBackupRestore";

/**
 * The two doors on the File Select screen that are not a hero: Restore a backup, and Link a phone.
 * Restore is the same pick-a-file-and-restore flow as Settings > General: a device with no profile has nobody to
 * protect, so anybody may use it. Link a phone shows only while the family has multiplayer on.
 */
export function useFileSelectDoors() {
  const familyStore = useFamilyStore();
  const ionRouter = useIonRouter();
  const { isBackupBusy, selectRestoreFile } = useBackupRestore();

  const isMultiplayerEnabled = computed(() => familyStore.enabled);
  const openLinkPhone = () => {
    ionRouter.push("/link");
  };

  return { isBackupBusy, selectRestoreFile, isMultiplayerEnabled, openLinkPhone };
}
