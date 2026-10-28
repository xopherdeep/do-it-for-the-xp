<template>
  <ion-modal
    :is-open="open"
    class="beast-maker"
    :class="rootClass"
    :style="rootStyle"
    :backdrop-dismiss="false"
    @didDismiss="emit('close')"
  >
    <!-- What the hero already made, when they have made something: the Maker opens on it -->
    <xp-my-creations v-if="creations.view === 'list'" :rows="creations.rows" :full="creations.isAtCap" @new="startNew" @fix="startFix" @resend="sendAgain" @open="openRow" @delete="removeRow" @close="emit('close')" />

    <xp-wizard-shell
      v-else-if="creations.view === 'steps' && !sentBeast"
      ref="shell"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      :title="t('beastMaker.title')"
      icon="paint-brush"
      :verb="t('beastMaker.ready.send')"
      verb-icon="paper-plane"
      :busy="saving"
      :jumpable="false"
      @close="emit('close')"
      @submit="send"
    >
      <!-- 1. LOOK: a picture of a drawing, or the library; the search and the battlefield button sit in the bar -->
      <template #look>
        <xp-beast-look-step :draft="draft" :hero-id="heroId" :browsing="browsing" :search="search" @photo="snapDrawing" @browse="browse" @pick="pick" />
      </template>

      <!-- 2. NAME: the beast waits on its plate while its name is typed below -->
      <template #name>
        <section class="bm-section bm-plate" data-test="step-name">
          <img v-if="portrait" class="bm-plate__art" :src="portrait" alt="" draggable="false" />
          <i v-else class="fad fa-dragon bm-plate__art" aria-hidden="true"></i>
          <p class="bm-nameplate" :class="{ 'is-empty': !draft.name.trim() }" data-test="nameplate">
            {{ draft.name.trim() || "???" }}
          </p>
        </section>
      </template>

      <!-- 3. CHORES: the ordered list that beats it; a new chore is typed at the bottom -->
      <template #chores>
        <section class="bm-section" data-test="step-chores">
          <xp-chore-rows v-if="draft.checklist.length" :chores="draft.checklist" @move="move" @drop="drop" />
          <p v-else class="bm-empty" data-test="no-chores">
            <i class="fad fa-tasks" aria-hidden="true"></i>
            <span>{{ t("beastMaker.chores.none") }}</span>
          </p>
          <p v-if="isFull" class="bm-note" data-test="chores-full">
            <i class="fad fa-check-circle" aria-hidden="true"></i>
            <span>{{ t("beastMaker.chores.full") }}</span>
          </p>
        </section>
      </template>

      <!-- 4. READY: the card as the family will see it, the note, then Send it (the shell's verb) -->
      <template #ready>
        <section class="bm-section" data-test="step-ready">
          <article class="bm-card" :aria-label="draft.name.trim()">
            <xp-beast-stage class="bm-card__stage" :portrait="portrait" :alt="draft.name.trim()" :bg1="draft.bg1" :bg2="draft.bg2" />
            <h2 class="bm-card__name" data-test="ready-name">{{ draft.name.trim() }}</h2>
            <p v-if="credit" class="bm-card__credit" data-test="ready-credit">{{ credit }}</p>
            <ol class="bm-card__chores" data-test="ready-chores">
              <li v-for="(chore, index) in chores" :key="`${index}-${chore}`">{{ chore }}</li>
            </ol>
          </article>
          <p class="bm-note" data-test="ready-note">
            <i class="fad fa-shield-check" aria-hidden="true"></i>
            <span>{{ t("beastMaker.ready.note") }}</span>
          </p>
        </section>
      </template>

      <!-- The step's field sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <template v-if="asked.id === 'look'">
          <label v-if="browsing" class="xp-app-search">
            <i class="fad fa-search" aria-hidden="true"></i>
            <input
              v-model="search"
              type="search"
              :placeholder="t('beastMaker.look.search')"
              :aria-label="t('beastMaker.look.search')"
              autocomplete="off"
              enterkeyhint="done"
              data-test="search"
              @keyup.enter="blurField"
            />
          </label>
          <button v-if="hasLook" type="button" class="xp-app-btn xp-app-btn--ghost bm-pick" data-test="pick-background" @click="pickBackground">
            <i class="fad fa-image" aria-hidden="true"></i>
            {{ t("beastMaker.look.background") }}
          </button>
        </template>

        <template v-else-if="asked.id === 'name'">
          <div v-if="suggestions.length" class="bm-chips" data-test="name-suggestions">
            <button v-for="name in suggestions" :key="name" type="button" class="bm-chip" data-test="name-chip" @click="takeName(name)">
              {{ name }}
            </button>
          </div>
          <label class="xp-app-search">
            <i class="fad fa-pencil" aria-hidden="true"></i>
            <input
              v-model="draft.name"
              type="text"
              :placeholder="t('beastMaker.name.placeholder')"
              :aria-label="t('beastMaker.name.placeholder')"
              autocomplete="off"
              enterkeyhint="done"
              maxlength="40"
              data-test="name-input"
              @keyup.enter="blurField"
            />
            <button type="button" class="xp-app-btn bm-add" data-test="name-suggest" @click="suggest">
              <i class="fad fa-sparkles" aria-hidden="true"></i>
              {{ t("beastMaker.name.suggest") }}
            </button>
          </label>
        </template>

        <label v-else-if="asked.id === 'chores'" class="xp-app-search">
          <i class="fad fa-plus" aria-hidden="true"></i>
          <input
            v-model="choreText"
            type="text"
            :placeholder="t('beastMaker.chores.placeholder')"
            :aria-label="t('beastMaker.chores.placeholder')"
            autocomplete="off"
            enterkeyhint="done"
            maxlength="80"
            :disabled="isFull"
            data-test="chore-input"
            @keyup.enter="addNewChore"
          />
          <button type="button" class="xp-app-btn bm-add" :disabled="isFull || !choreText.trim()" data-test="chore-add" @click="addNewChore">
            + chore
          </button>
        </label>
      </template>
    </xp-wizard-shell>

    <!-- Sent: the beast once more, then Make a quest with it or Done, at the bottom -->
    <div v-else-if="sentBeast" class="bm-sent" data-test="sent">
      <ion-header>
        <ion-toolbar>
          <xp-app-header :title="t('beastMaker.title')" icon="paint-brush" :meta="t('beastMaker.done.title')">
            <template #end>
              <xp-close-button size="lg" color="light" aria-label="Close" data-test="sent-close" @click="emit('close')" />
            </template>
          </xp-app-header>
        </ion-toolbar>
      </ion-header>
      <ion-content :scroll-y="true">
        <section class="bm-section">
          <article class="bm-card" :aria-label="draft.name.trim()">
            <xp-beast-stage class="bm-card__stage" :portrait="portrait" :alt="draft.name.trim()" :bg1="draft.bg1" :bg2="draft.bg2" :live="false" />
            <h2 class="bm-card__name" data-test="sent-name">{{ draft.name.trim() }}</h2>
            <p v-if="credit" class="bm-card__credit">{{ credit }}</p>
          </article>
          <p class="bm-note">
            <i class="fad fa-shield-check" aria-hidden="true"></i>
            <span>{{ t("beastMaker.ready.note") }}</span>
          </p>
        </section>
      </ion-content>
      <ion-footer class="bm-sent__footer">
        <div class="bm-sent__nav">
          <button type="button" class="xp-app-btn xp-app-btn--ghost bm-sent__btn" data-test="sent-done" @click="emit('close')">
            <i class="fad fa-door-open" aria-hidden="true"></i>
            {{ t("beastMaker.done.close") }}
          </button>
          <button type="button" class="xp-app-btn bm-sent__btn" data-test="sent-quest" @click="makeQuest">
            <i class="fad fa-scroll" aria-hidden="true"></i>
            {{ t("beastMaker.done.quest") }}
          </button>
        </div>
      </ion-footer>
    </div>

    <!-- Its own button is hidden: the battlefield button on the Look step opens the sheet, in thumb reach -->
    <xp-background-selector
      ref="backgroundSelector"
      class="bm-selector"
      :target-ref="backdropTarget"
      :initial-bg1="draft.bg1"
      :initial-bg2="draft.bg2"
      :aspect-ratio="draft.aspectRatio"
      @background-changed="onBackgroundChanged"
    />

    <!-- A beast in the game opens its Beast Card from the list, to look at: Hunt and Claim stay in the Beast Log -->
    <xp-beast-card-modal v-if="creations.cardQuest" :quest="creations.cardQuest" status="open" :user-id="heroId" :locked-notice="t('beastMaker.list.cardNote')" @didDismiss="creations.cardQuest = null" />

    <!-- Fanfare reveal once the beast is sent: staged over the modal, then the two buttons -->
    <xp-hero-fanfare
      :open="showFanfare"
      :name="draft.name.trim()"
      :subtitle="credit"
      :title="t('beastMaker.done.title')"
      :action-text="t('beastMaker.done.next')"
      :portrait="portrait"
      @done="finishFanfare"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar, modalController } from "@ionic/vue";
import { v4 as uuidv4 } from "uuid";
import { play$fx } from "@/assets/fx";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import { beastProblem, dropChore, filledChores, moveChore, newBeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpBackgroundSelector from "@/components/molecules/BackgroundSelector/XpBackgroundSelector.vue";
import BeastPhotoPicker from "@/components/organisms/BeastPhoto/BeastPhotoPicker.vue";
import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useToast } from "@/hooks/useToast";
import { useCopy, useReadAloud, useVoice } from "@/hooks/useVoice";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { addMakerChore, libraryLook, makerSteps, MAX_MAKER_CHORES, proposedBeast, suggestNames } from "@/lib/services/creations/beastMaker";
import { creditLine } from "@/lib/services/creations/creations";
import { mayPropose } from "@/lib/services/creations/makerCap";
import { sendFixedBeast } from "@/lib/services/creations/myCreations";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { useCreationRows, useMyCreations } from "../useMyCreations";
import XpBeastCardModal from "./XpBeastCardModal.vue";
import XpBeastLookStep from "./XpBeastLookStep.vue";
import XpBeastStage from "./XpBeastStage.vue";
import XpChoreRows from "./XpChoreRows.vue";
import XpMyCreations from "./XpMyCreations.vue";

/**
 * The Beast Maker (kid-creations design, section 5): a maker kid gives a beast a look (a photo of their drawing, or a
 * library portrait on its battlefield), a name, the chores that beat it, and sends it to the Game Master as a proposal.
 * The screens are the steps of the shared wizard shell; every rule is beastMaker.ts over the Game Master's own draft
 * (beastWizard.ts). A hero who has made things opens on the list of them (XpMyCreations). After the fanfare, "Make a
 * quest with it" hands the beast to the page, which opens the Quest Wizard on it; "Done" closes.
 */

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  saved: [beast: Beast];
  quest: [beast: Beast];
}>();

const { rootClass, rootStyle } = useAppSkin("quests");
const t = useCopy();
const { voice } = useVoice();
const { startAutoReading, stopReading } = useReadAloud();
const { showToast } = useToast();
const userStore = useUserStore();
// The signed-in hero, as the Quest Wizard reads them: the beast is made by them and credited to them, whatever page
// the Maker opened from (a page at a sibling's address must not make as the sibling)
const me = computed(() => String(userStore.currentUser.id ?? ""));

// ---- The draft -----------------------------------------------------------------------------------------------------

const draft = ref<BeastDraft>(newBeastDraft());
const steps = computed(() => makerSteps(voice.value));
const position = ref(0);
// The list of what the hero already made opens first; Fix it and Draw a new beast hand the steps their draft
const { state: creations, open: openList, refresh, startNew, startFix } = useMyCreations(() => me.value, draft, position);
const { sendAgain, removeRow, openRow } = useCreationRows(creations, refresh);
const saving = ref(false);
const shell = ref<InstanceType<typeof XpWizardShell> | null>(null);
// The library beast the look came from: its chore seeds the name suggestions
const pickedEntry = ref<LibraryEntry | null>(null);
const browsing = ref(false);
const search = ref("");
const choreText = ref("");
const suggestions = ref<string[]>([]);
const showFanfare = ref(false);
const sentBeast = ref<Beast | null>(null);

// Every time the Maker opens it starts fresh; closing it cuts the voice off
watch(
  () => props.open,
  (isOpen, wasOpen) => {
    const isClosing = wasOpen && !isOpen;
    if (isClosing) stopReading();
    if (!isOpen) return;
    draft.value = newBeastDraft();
    position.value = 0;
    pickedEntry.value = null;
    browsing.value = false;
    search.value = "";
    choreText.value = "";
    suggestions.value = [];
    saving.value = false;
    showFanfare.value = false;
    sentBeast.value = null;
    void openList();
  },
  { immediate: true }
);

// The guide's question in the hero's voice; the simple voice reads each one aloud as it appears
const guideLine = computed(() => steps.value[position.value]?.guide ?? "");
watch(
  [() => props.open, guideLine, () => creations.view],
  ([isOpen, line, screen]) => {
    const readsAloud = isOpen && screen === "steps";
    if (readsAloud) startAutoReading(line);
  },
  { immediate: true }
);

const blurField = (event: Event) => (event.target as HTMLInputElement | null)?.blur();

/** The toast is the RPG message box in the middle of the screen, where the hero is looking */
const say = (line: string) => {
  showToast(line, 2600).catch((error) => debug.warn("[BeastMaker] the toast could not be shown", error));
};

// ---- 1. Look -------------------------------------------------------------------------------------------------------

// A drawing is the portrait when there is one, even over a library beast picked before it
const portrait = computed(() => draft.value.localImage || (beastPortraitUrl(draft.value.avatar) ?? ""));
const hasLook = computed(() => Boolean(draft.value.localImage) || draft.value.avatar > 0);

const browse = () => {
  play$fx("cursor");
  browsing.value = !browsing.value;
};

const pick = (entry: LibraryEntry) => {
  play$fx("cursor");
  draft.value = libraryLook(draft.value, entry);
  pickedEntry.value = entry;
  search.value = "";
  shell.value?.scrollToTop(200);
};

const snapDrawing = async () => {
  play$fx("openMenu");
  try {
    // From the Maker the sheet reads its guide line aloud, as the Maker's own screens do (the simple voice)
    const modal = await modalController.create({ component: BeastPhotoPicker, cssClass: "beast-photo-modal", componentProps: { autoRead: true } });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<string | null>();
    const isNotNow = role !== "picked";
    if (isNotNow) return;
    const isDrawing = typeof data === "string" && data.startsWith("data:");
    if (!isDrawing) {
      play$fx("no");
      say(t("beastMaker.error.photo"));
      return;
    }
    draft.value = { ...draft.value, localImage: data };
    // The drawing is the look now: a library beast picked before it no longer seeds the name
    pickedEntry.value = null;
    browsing.value = false;
    shell.value?.scrollToTop(200);
  } catch (error) {
    debug.warn("[BeastMaker] the drawing picker could not be opened", error);
    play$fx("no");
    say(t("beastMaker.error.photo"));
  }
};

// The battlefield sheet (the Game Master's form uses the same one) reads the draft's layers and hands back a new pair;
// the stage on screen repaints itself from the draft
const backgroundSelector = ref<InstanceType<typeof XpBackgroundSelector> | null>(null);
const backdropTarget = computed(() => ({ bg1: draft.value.bg1, bg2: draft.value.bg2, aspectRatio: draft.value.aspectRatio }));

const pickBackground = () => {
  play$fx("openMenu");
  backgroundSelector.value?.openBgControlsModal?.();
};

const onBackgroundChanged = (picked: { bg1: number; bg2: number; aspectRatio?: number }) => {
  const hasAspectRatio = picked.aspectRatio !== undefined;
  draft.value = { ...draft.value, bg1: picked.bg1, bg2: picked.bg2, ...(hasAspectRatio ? { aspectRatio: picked.aspectRatio } : {}) };
};

// ---- 2. Name -------------------------------------------------------------------------------------------------------

// Names come from the kid's own chores first, else from the chore of the library beast the look came from
const nameSeeds = computed(() => {
  const libraryChore = pickedEntry.value?.chore;
  return [...filledChores(draft.value), ...(libraryChore ? [libraryChore] : [])];
});

const suggest = () => {
  play$fx("select");
  suggestions.value = suggestNames(nameSeeds.value);
};

const takeName = (name: string) => {
  play$fx("cursor");
  draft.value = { ...draft.value, name };
};

// ---- 3. Chores -----------------------------------------------------------------------------------------------------

const chores = computed(() => filledChores(draft.value));
const isFull = computed(() => draft.value.checklist.length >= MAX_MAKER_CHORES);

const addNewChore = () => {
  const isBlank = !choreText.value.trim();
  const addsNothing = isBlank || isFull.value;
  if (addsNothing) return;
  play$fx("select");
  draft.value = { ...draft.value, checklist: addMakerChore(draft.value.checklist, choreText.value) };
  choreText.value = "";
};

const move = (index: number, step: -1 | 1) => {
  play$fx("cursor");
  draft.value = { ...draft.value, checklist: moveChore(draft.value.checklist, index, step) };
};

const drop = (index: number) => {
  play$fx("cursor");
  draft.value = { ...draft.value, checklist: dropChore(draft.value.checklist, index) };
};

// ---- 4. Ready and Send it (Back and Next are the shell's) -------------------------------------------------------

const nickOfHero = (id: string): string => {
  const name = userStore.users[id]?.name;
  return name?.nick || name?.first || "";
};
// "Drawn by Mia" for a drawing, "Made by Mia" for a library look; nothing for a hero the device does not know
const credit = computed(() => creditLine({ madeBy: me.value, localImage: draft.value.localImage }, "beast", nickOfHero));

// The Bestiary makes an id up and never hands it back, so the beast gets one here: the Quest Wizard opens on it
const saveNewBeast = async (): Promise<Beast> => {
  const beast: Beast = { ...proposedBeast(draft.value, me.value, new Date()), id: uuidv4() };
  await new BestiaryDb(beastStorage).setBeast(beast);
  return beast;
};

const send = async () => {
  if (saving.value) return;
  const problem = beastProblem(draft.value);
  if (problem) {
    play$fx("no");
    say(problem);
    return;
  }
  saving.value = true;
  try {
    // The cap counts this hero's beasts and quests still with the Game Master, together; a beast that came back is among them
    const isCapped = !creations.fixing && !(await mayPropose(me.value));
    if (isCapped) {
      play$fx("no");
      say(t("beastMaker.cap"));
      return;
    }
    const beast = creations.fixing ? await sendFixedBeast(draft.value, new Date()) : await saveNewBeast();
    // The Game Master settled the beast while it was being fixed: the list shows where it stands now
    if (!beast) {
      play$fx("no");
      say(t("beastMaker.error.list"));
      await refresh();
      return;
    }
    sentBeast.value = beast;
    showFanfare.value = true;
    emit("saved", beast);
  } catch (error) {
    debug.warn("[BeastMaker] the beast could not be saved", error);
    play$fx("no");
    say(t("beastMaker.error.notSaved"));
  } finally {
    saving.value = false;
  }
};

const finishFanfare = () => {
  showFanfare.value = false;
};

const makeQuest = () => {
  const beast = sentBeast.value;
  if (!beast) return;
  play$fx("select");
  emit("quest", beast);
};
</script>

<style lang="scss" scoped src="./_XpBeastMakerModal.scss" />
