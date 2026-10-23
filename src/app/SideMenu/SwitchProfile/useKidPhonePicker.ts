import { computed } from "vue";
import { useCopy } from "@/hooks/useVoice";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";

/** What the line says of a hero the phone has not received yet and whose card has no nickname either */
const UNKNOWN_NICK = "the hero";

/**
 * The File Select screen on a kid phone (family sync spec, section 7): the one hero this phone is linked to, under the
 * line "This is {nick}'s phone", and none of the doors that start or bring back a family (new profile, Quick Start,
 * restore, link a phone). On every other device the list is every profile and the line is empty.
 */
export function useKidPhonePicker() {
  const family = useFamilyStore();
  const userStore = useUserStore();
  const t = useCopy();

  const isKidMode = computed(() => family.isKidMode);
  const users = computed(() => {
    const everyone = userStore.usersAz;
    if (!isKidMode.value) return everyone;
    const heroId = family.device?.heroId;
    return everyone.filter((profile) => String(profile.id) === heroId);
  });
  const thisPhoneLine = computed(() => {
    const nick = users.value[0]?.name?.nick || family.device?.card?.nickname || UNKNOWN_NICK;
    return t("sync.thisPhone", { nick });
  });

  return { isKidMode, users, thisPhoneLine };
}
