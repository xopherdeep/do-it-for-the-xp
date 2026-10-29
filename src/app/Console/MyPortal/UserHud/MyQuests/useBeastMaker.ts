/**
 * The Beast Maker's wiring on a hero's pages (the Beast Log, the Calendar), shared so both read the same way: whether
 * the signed-in hero may draw a beast (a maker, Settings > Party; never a Game Master, who has the Compendium), the
 * Maker's open flag and the Quest Wizard's, and the hand-off between them: "Make a quest with it" closes the Maker and
 * opens the wizard on the new beast, whose id rides on the page's prefill until the wizard closes.
 *
 * The maker is the signed-in hero, never the hero whose page is on screen: a page opened at a sibling's address
 * (/my-tasks/<sibling>) must not draw, send again or delete as the sibling. The Quest Wizard and the Beast Maker read
 * the same hero from the store themselves.
 */
import { computed, ref, watch } from "vue";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { canMake } from "@/lib/services/family/familySettings";
import type { QuestPrefill } from "@/lib/services/quests/questPrefill";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { resolveGmAccess } from "@/router/_Guards/gm.guard";

/** `basePrefill` is what the page gives the Quest Wizard on its own (the day and part of the day on screen, the hero). */
export function useBeastMaker(basePrefill: () => QuestPrefill) {
  const userStore = useUserStore();
  const rules = useGameRulesStore();
  void rules.load();

  /** The signed-in hero: the one who may be a maker */
  const makerId = computed(() => String(userStore.currentUser.id ?? ""));

  // Only a profile flagged as a Game Master (or a Game Master playing as a hero) is kept out: they make beasts in the
  // Compendium. A device with no Game Master at all does not turn every hero into one: the safe rules apply.
  const isGm = computed(() => {
    const access = resolveGmAccess(userStore);
    return access === "game-master" || access === "masquerade";
  });
  const isMaker = computed(() => !isGm.value && canMake(makerId.value, { makers: rules.makers }));

  const makerOpen = ref(false);
  const wizardOpen = ref(false);
  /** The beast the Quest Wizard opens on: set by "Make a quest with it", cleared when the wizard closes */
  const questBeastId = ref("");
  watch(wizardOpen, (isOpen) => {
    if (!isOpen) questBeastId.value = "";
  });

  const wizardPrefill = computed<QuestPrefill>(() =>
    questBeastId.value ? { ...basePrefill(), beastId: questBeastId.value } : basePrefill()
  );

  /** "Make a quest with it": the Maker closes and the Quest Wizard opens on the beast just sent */
  const openWizardWith = (beast: Beast) => {
    makerOpen.value = false;
    questBeastId.value = String(beast.id ?? "");
    wizardOpen.value = true;
  };

  return { isMaker, makerOpen, wizardOpen, wizardPrefill, openWizardWith };
}
