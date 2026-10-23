<template>
  <ion-card v-if="visible" class="max-w-2xl xp-family-phones" data-cy="family-phones">
    <ion-card-header>
      <ion-card-title>Hero phones</ion-card-title>
    </ion-card-header>
    <ion-list>
      <ion-item v-for="banner in banners" :key="banner.id" lines="none" class="fp-banner" data-cy="family-banner">
        <ion-label class="ion-text-wrap">{{ banner.line }}</ion-label>
        <ion-button v-if="banner.action" slot="end" size="small" :data-cy="banner.action.cy" @click="banner.action.run">
          {{ banner.action.label }}
        </ion-button>
      </ion-item>

      <ion-item v-for="hero in heroes" :key="hero.id" :data-hero="hero.id" class="fp-hero" data-cy="family-hero">
        <ion-label class="ion-text-wrap">
          <h2>{{ hero.title }}</h2>
          <p v-if="!hero.hasNickname" class="fp-needs-nickname" data-cy="family-needs-nickname">{{ hero.needsNicknameLine }}</p>
          <div v-if="hero.needsAgePick" class="fp-ages">
            <small>Age group</small>
            <ion-button
              v-for="group in AGE_GROUP_CHOICES"
              :key="group.id"
              size="small"
              :fill="hero.group === group.id ? 'solid' : 'outline'"
              :aria-pressed="hero.group === group.id"
              :data-cy="`age-${hero.id}-${group.id}`"
              @click="pickAgeGroup(hero.id, group.id)"
            >
              {{ group.label }}
            </ion-button>
          </div>
        </ion-label>
        <ion-buttons slot="end">
          <ion-button v-if="!hero.hasNickname" color="success" data-cy="family-edit" @click="editProfile(hero.profile)">
            <i class="fad fa-edit mr-2"></i>
            Edit
          </ion-button>
          <ion-button v-else :disabled="!PHONES_MODAL_READY" data-cy="family-phones-open" @click="openPhonesModal(hero.id, hero.title)">
            <i class="fad fa-mobile-alt mr-2"></i>
            Phones
          </ion-button>
        </ion-buttons>
      </ion-item>
    </ion-list>

    <!-- The clerk's dialog: the game's own prompt, not a native sheet or toast -->
    <xp-reveal-prompt :prompt="prompt" @respond="respond" />
  </ion-card>

  <ion-card v-else-if="showUnlinkedPrompt" class="max-w-2xl xp-family-phones-connect" data-cy="family-phones-connect">
    <ion-card-header>
      <ion-card-title>Hero phones</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p class="ion-margin-bottom">
        Connect to the Town Hall to link hero phones and enable multiplayer for your family.
      </p>
      <ion-button size="small" data-cy="connect-town-hall" @click="goToTownHall">
        Go to the Town Hall
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  modalController,
} from "@ionic/vue";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import XpHeroPhonesModal from "./XpHeroPhonesModal.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useCopy, useVoice } from "@/hooks/useVoice";
import { ageGroupOf, needsAgePick, type AgeGroup } from "@/lib/services/multiplayer/ageGroup";
import { homeQuestionPrompt, type FamilyCopyKey } from "@/lib/services/multiplayer/familyPrompts";
import type { FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { cardOf } from "@/lib/services/multiplayer/heroCard";
import { FAMILY_ROAD_CLOSED_LINE, isFamilyRoadClosedProblem } from "@/lib/services/townhall/townHallPrompts";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * The family card in Family Settings (Game Master only): each hero's nickname check and age group, the home-device
 * banners, and a Phones button per hero. Shown only with the multiplayer flag on and the family linked to the Town Hall.
 */
const family = useFamilyStore();
const userStore = useUserStore();
const router = useRouter();
const t = useCopy();
const { voice } = useVoice();
const { prompt, showPrompt: ask, submitAnswer: respond } = useRevealPrompt();

/** The Phones button opens the Link a phone modal (MP15) */
const PHONES_MODAL_READY = true;

const AGE_GROUP_CHOICES: { id: AgeGroup; label: string }[] = [
  { id: "child", label: "Under 13" },
  { id: "teen", label: "13 to 17" },
  { id: "adult", label: "18 and up" },
];

/** A kid phone has no Phones panel (the sync spec, section 7): only Game Master devices link and unlink phones */
const isGameMasterDevice = computed(() => family.enabled && !family.isKidMode);
const visible = computed(() => isGameMasterDevice.value && family.parentAuth !== null);
const showUnlinkedPrompt = computed(() => isGameMasterDevice.value && family.parentAuth === null);

/** What the Game Master calls the hero in the clerk's line: the first name, else the first word of the full name */
const firstNameOf = (profile: { name?: { first?: string; full?: string } }): string => {
  const first = profile.name?.first?.trim();
  return first || profile.name?.full?.trim().split(/\s+/)[0] || "This hero";
};

const heroes = computed(() =>
  userStore.usersAz.map((profile) => {
    const card = cardOf(profile);
    const hasNickname = card !== null;
    return {
      id: profile.id as string,
      profile,
      hasNickname,
      title: card?.nickname || profile.name?.full || "Hero",
      needsNicknameLine: t("family.needsNickname", { name: firstNameOf(profile) }),
      needsAgePick: needsAgePick(profile),
      group: ageGroupOf(profile, family.ageGroupPicks[profile.id]),
    };
  })
);

const pickAgeGroup = (heroId: string, group: AgeGroup): Promise<void> => family.setAgeGroup(heroId, group);

/** Opens the Link a phone modal for a hero */
async function openPhonesModal(heroId: string, nickname: string): Promise<void> {
  try {
    const modal = await modalController.create({
      component: XpHeroPhonesModal,
      componentProps: { heroId, nickname },
    });
    await modal.present();
  } catch (error) {
    debug.error("Could not open hero phones modal:", error);
  }
}

/** The profile form, so the Game Master can give a nickname; the site hears of the hero once it is saved */
async function editProfile(profile: unknown): Promise<void> {
  try {
    const modal = await modalController.create({ component: AddProfile, cssClass: "fullscreen", componentProps: { profile } });
    await modal.present();
    await modal.onDidDismiss();
    await userStore.loadUsers();
    await family.registerHeroes();
  } catch (error) {
    debug.error("The profile form could not be used:", error);
  }
}

/** "Make this one home?" in the clerk's words; Yes moves the family's home here */
async function askToMakeHome(): Promise<void> {
  const answer = await ask(homeQuestionPrompt(voice.value));
  const saidYes = answer === "yes";
  if (saidYes) await family.makeHome();
}

const goToTownHall = () => router.push({ name: "town-hall", params: { userId: userStore.currentUser.id ?? undefined } });

interface Banner {
  id: string;
  line: string;
  action?: { cy: string; label: string; run: () => unknown };
}

/** The line for each trouble the site reported that the Game Master can read about */
const PROBLEM_LINES: Partial<Record<FamilyProblem, FamilyCopyKey>> = {
  taken: "family.taken",
  "not-member": "family.notMember",
};

/** The courier is late (no signal, or the family server is not there): the courier line, then what it means for the family */
const roadClosedLine = (): string => `${t("family.offline")} ${FAMILY_ROAD_CLOSED_LINE}`;

/** The clerk's line for a problem the site reported, if the Game Master has one to read */
const lineOfProblem = (problem: FamilyProblem | null): string | undefined => {
  const isRoadClosed = isFamilyRoadClosedProblem(problem);
  if (isRoadClosed) return roadClosedLine();
  const key = problem ? PROBLEM_LINES[problem] : undefined;
  return key ? t(key) : undefined;
};

const banners = computed((): Banner[] => {
  const found: Banner[] = [];
  const isHomeElsewhere = family.home === "home-elsewhere";
  const isOtherFamily = family.home === "other-family" || (family.problem as string) === "other-family";
  if (isHomeElsewhere) {
    found.push({ id: "home-elsewhere", line: t("family.homeElsewhere"), action: { cy: "family-make-home", label: "Make this home", run: askToMakeHome } });
  }
  if (isOtherFamily) found.push({ id: "other-family", line: t("family.otherFamily") });
  const isHomeTaken = (family.home as string) === "taken";
  const isHomeNotMember = (family.home as string) === "not-member";
  const hasHomeProblem = isHomeTaken || isHomeNotMember;
  const rawProblem = family.problem ?? (hasHomeProblem ? (family.home as FamilyProblem) : null);
  const problemLine = lineOfProblem(rawProblem);
  const alreadyHasBanner = found.some((b) => b.id === `problem-${rawProblem}`);
  const hasProblemLine = problemLine !== undefined && !alreadyHasBanner;
  const shouldShowProblem = hasProblemLine && Boolean(rawProblem);
  if (shouldShowProblem) {
    const isUnknownToSite = rawProblem === "not-member";
    const action = isUnknownToSite ? { cy: "family-register", label: "Go to the Town Hall", run: goToTownHall } : undefined;
    found.push({ id: `problem-${rawProblem}`, line: problemLine as string, action });
  }
  return found;
});
</script>

<style lang="scss" scoped>
.xp-family-phones {
  ion-item {
    --padding-start: 8px;
    --inner-padding-end: 8px;
  }

  .fp-banner {
    --background: var(--ion-color-light);
    font-size: 14px;
  }

  .fp-needs-nickname {
    font-style: italic;
  }

  .fp-ages {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: 6px;

    small {
      margin-right: 4px;
      color: var(--ion-color-medium);
    }
  }
}
</style>
