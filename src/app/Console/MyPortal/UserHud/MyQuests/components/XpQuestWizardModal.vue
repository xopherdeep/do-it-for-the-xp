<template>
  <ion-modal
    :is-open="open"
    class="quest-wizard"
    :class="rootClass"
    :style="rootStyle"
    :backdrop-dismiss="false"
    @didDismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="New Quest" icon="scroll" :meta="`${position + 1} / ${steps.length}`">
          <template #end>
            <xp-close-button size="lg" color="light" aria-label="Close" data-test="wizard-close" @click="emit('close')" />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="content" class="qw-content" :scroll-y="true">
      <!-- Where we are: one dot per question -->
      <ol class="qw-dots" :aria-label="`Question ${position + 1} of ${steps.length}`">
        <li
          v-for="(id, index) in steps"
          :key="id"
          class="qw-dot"
          :class="{ 'is-done': index < position, 'is-here': index === position }"
        ></li>
      </ol>

      <!-- The guide asks one question per screen -->
      <p class="qw-guide" data-test="guide">
        <i :class="['fad', `fa-${STEP_ICON[step]}`]" aria-hidden="true"></i>
        <span>{{ guideLine }}</span>
        <xp-speak-button :text="guideLine" />
      </p>

      <!-- 1. WHAT: a picture for every chore -->
      <section v-if="step === 'what'" class="qw-section" data-test="step-what">
        <div v-if="draft.name.trim()" class="qw-chosen" data-test="chosen">
          <img v-if="chosenPortrait" :src="chosenPortrait" alt="" class="qw-chosen__art" />
          <i v-else class="fad fa-paw-claws qw-chosen__art" aria-hidden="true"></i>
          <span class="qw-chosen__name">{{ draft.name }}</span>
          <i class="fad fa-check-circle qw-chosen__check" aria-hidden="true"></i>
        </div>

        <div class="qw-grid qw-grid--chores">
          <button
            type="button"
            class="qw-tile qw-tile--own"
            :class="{ 'is-picked': draft.isOwn && !!draft.name.trim() }"
            data-test="tile-own"
            @click="onOwnTile"
          >
            <span class="qw-tile__art">
              <img v-if="ownPortrait" :src="ownPortrait" alt="" />
              <i v-else class="fad fa-pencil" aria-hidden="true"></i>
              <i v-if="ownPortrait" class="fad fa-pencil qw-tile__pen" aria-hidden="true"></i>
            </span>
            <span class="qw-tile__label">{{ ownLabel }}</span>
          </button>

          <button
            v-for="entry in tiles"
            :key="String(entry.id)"
            type="button"
            class="qw-tile"
            :class="{ 'is-picked': isPicked(entry) }"
            :aria-pressed="isPicked(entry)"
            :aria-label="`${choreName(entry)} (${entry.name})`"
            data-test="tile-chore"
            :data-beast="String(entry.id)"
            @click="pick(entry)"
          >
            <span class="qw-tile__art">
              <img v-if="portrait(entry)" :src="portrait(entry) ?? ''" alt="" loading="lazy" />
              <i v-else class="fad fa-dragon" aria-hidden="true"></i>
            </span>
            <span class="qw-tile__label">{{ choreName(entry) }}</span>
            <i v-if="isPicked(entry)" class="fad fa-check-circle qw-tile__check" aria-hidden="true"></i>
          </button>

          <button v-if="canShowMore" type="button" class="qw-tile qw-tile--more" data-test="tile-more" @click="showAll = true">
            <span class="qw-tile__art"><i class="fad fa-ellipsis-h" aria-hidden="true"></i></span>
            <span class="qw-tile__label">More</span>
          </button>
        </div>
        <p v-if="isSearching && !tiles.length" class="qw-note" data-test="no-match">
          {{ t("questWizard.what.noMatch") }}
        </p>
      </section>

      <!-- 2. STEPS: the checklist, skippable -->
      <section v-else-if="step === 'steps'" class="qw-section" data-test="step-steps">
        <ol v-if="draft.steps.length" class="qw-steps">
          <li v-for="(text, index) in draft.steps" :key="`${index}-${text}`" class="qw-step" data-test="step-row">
            <span class="qw-step__n" aria-hidden="true">{{ index + 1 }}</span>
            <span class="qw-step__text">{{ text }}</span>
            <button type="button" class="qw-step__x" :aria-label="`Drop ${text}`" data-test="step-drop" @click="drop(index)">
              <i class="fad fa-times" aria-hidden="true"></i>
            </button>
          </li>
        </ol>
        <p v-else class="qw-empty" data-test="no-steps">
          <i class="fad fa-tasks" aria-hidden="true"></i>
          <span>{{ t("questWizard.steps.none") }}</span>
        </p>
      </section>

      <!-- 3. WHEN -->
      <section v-else-if="step === 'when'" class="qw-section" data-test="step-when">
        <div class="qw-grid qw-grid--3">
          <button
            v-for="choice in WHEN_CHOICES"
            :key="choice.id"
            type="button"
            class="qw-tile qw-tile--big"
            :class="{ 'is-picked': draft.when === choice.id }"
            :aria-pressed="draft.when === choice.id"
            :data-test="`when-${choice.id}`"
            @click="chooseWhen(choice.id)"
          >
            <i :class="['fad', `fa-${choice.icon}`, 'qw-tile__icon']" aria-hidden="true"></i>
            <span class="qw-tile__label">{{ whenLabel(choice) }}</span>
          </button>
        </div>

        <div v-if="draft.when === 'days'" class="qw-days" role="group" aria-label="Which days">
          <button
            v-for="token in DAY_TOKENS"
            :key="token"
            type="button"
            class="qw-day"
            :class="{ 'is-picked': draft.days.includes(token) }"
            :aria-pressed="draft.days.includes(token)"
            :data-test="`day-${token}`"
            @click="chooseDay(token)"
          >
            {{ DAY_LABELS[token] }}
          </button>
        </div>

        <h2 class="qw-sub">{{ t("questWizard.when.time") }}</h2>
        <div class="qw-grid qw-grid--3">
          <button
            v-for="choice in TIME_CHOICES"
            :key="choice.id"
            type="button"
            class="qw-tile qw-tile--big"
            :class="{ 'is-picked': draft.time === choice.id }"
            :aria-pressed="draft.time === choice.id"
            :data-test="`time-${choice.id}`"
            @click="chooseTime(choice.id)"
          >
            <i :class="['fad', `fa-${choice.icon}`, 'qw-tile__icon']" aria-hidden="true"></i>
            <span class="qw-tile__label">{{ choice.label }}</span>
          </button>
        </div>
      </section>

      <!-- 4. HOW BIG: the size sets the rewards -->
      <section v-else-if="step === 'size'" class="qw-section" data-test="step-size">
        <div class="qw-grid" :class="sizes.length > 4 ? 'qw-grid--3' : 'qw-grid--2'">
          <button
            v-for="size in sizes"
            :key="size.id"
            type="button"
            class="qw-tile qw-tile--big"
            :class="{ 'is-picked': difficulty === size.id }"
            :aria-pressed="difficulty === size.id"
            :data-test="`size-${size.label.toLowerCase()}`"
            @click="chooseSize(size.id)"
          >
            <i :class="['fad', `fa-${size.icon}`, 'qw-tile__icon']" aria-hidden="true"></i>
            <span class="qw-tile__label">{{ size.label }}</span>
          </button>
        </div>
        <div class="qw-rewards" data-test="rewards">
          <span class="qw-rewards__label">{{ t("questWizard.size.earn") }}</span>
          <xp-app-chip kind="xp" :value="rewards.xp" />
          <xp-app-chip kind="gp" :value="rewards.gp" />
          <xp-app-chip kind="ap" :value="rewards.ap" />
        </div>
      </section>

      <!-- 5. WHO (a Game Master only): hero tiles -->
      <section v-else-if="step === 'who'" class="qw-section" data-test="step-who">
        <div class="qw-grid qw-grid--3">
          <button
            v-for="hero in heroes"
            :key="hero.id"
            type="button"
            class="qw-tile qw-tile--hero"
            :class="{ 'is-picked': draft.heroIds.includes(hero.id) }"
            :aria-pressed="draft.heroIds.includes(hero.id)"
            :data-test="`hero-${hero.id}`"
            @click="chooseHero(hero.id)"
          >
            <span class="qw-tile__art qw-tile__art--round"><img :src="avatarOf(hero)" alt="" /></span>
            <span class="qw-tile__label">{{ nameOf(hero) }}</span>
            <i v-if="draft.heroIds.includes(hero.id)" class="fad fa-check-circle qw-tile__check" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <!-- 6. READY: the beast card, then Summon -->
      <section v-else class="qw-section" data-test="step-ready">
        <article class="qw-card" :class="`qw-card--${tier.tier}`" :aria-label="`${draft.name}, ${tier.label}`">
          <div class="qw-card__beast">
            <img v-if="chosenPortrait" :src="chosenPortrait" :alt="beastName" class="qw-card__portrait" />
            <i v-else class="fad fa-dragon qw-card__portrait" aria-hidden="true"></i>
            <span class="qw-card__tier" :data-tier="tier.tier">
              <i :class="['fad', `fa-${tier.icon}`]" aria-hidden="true"></i>
              {{ tier.label }}
            </span>
          </div>
          <h2 class="qw-card__name" data-test="ready-name">{{ questName }}</h2>
          <p class="qw-card__sub">{{ beastName }}</p>
          <ul class="qw-card__facts">
            <li><i class="fad fa-calendar-day" aria-hidden="true"></i><span data-test="ready-when">{{ whenText }}</span></li>
            <li>
              <i class="fad fa-tasks" aria-hidden="true"></i>
              <span>{{ draft.steps.length ? `${draft.steps.length} steps` : "1 step" }}</span>
            </li>
            <li v-if="isGm" class="qw-card__party">
              <i class="fad fa-users" aria-hidden="true"></i>
              <span>{{ partyNames }}</span>
            </li>
          </ul>
          <div class="qw-card__rewards">
            <xp-app-chip kind="xp" :value="rewards.xp" />
            <xp-app-chip kind="gp" :value="rewards.gp" />
            <xp-app-chip kind="ap" :value="rewards.ap" />
            <xp-app-chip v-if="needsApproval" kind="tag" value="GM approves" />
          </div>
        </article>

        <!-- A hero's quest always waits for the Game Master; a Game Master chooses -->
        <button
          v-if="isGm"
          type="button"
          class="qw-toggle"
          :class="{ 'is-on': draft.requiresApproval }"
          role="switch"
          :aria-checked="draft.requiresApproval"
          data-test="approval-toggle"
          @click="toggleApproval"
        >
          <i :class="['fad', draft.requiresApproval ? 'fa-check-square' : 'fa-square']" aria-hidden="true"></i>
          <span>Needs approval</span>
        </button>
        <p v-else class="qw-note" data-test="kid-note">
          <i class="fad fa-shield-check" aria-hidden="true"></i>
          {{ t("questWizard.ready.kidNote") }}
        </p>
      </section>
    </ion-content>

    <!-- Search, the step field and Back / Next sit at the bottom, in thumb reach -->
    <ion-footer class="qw-footer">
      <div class="qw-bar">
        <label v-if="step === 'what'" class="xp-app-search">
          <i class="fad fa-search" aria-hidden="true"></i>
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            :placeholder="t('questWizard.what.searchPlaceholder')"
            :aria-label="t('questWizard.what.searchPlaceholder')"
            autocomplete="off"
            enterkeyhint="done"
            data-test="search"
            @input="onType"
            @keyup.enter="onEnterSearch"
          />
        </label>
        <label v-else-if="step === 'steps'" class="xp-app-search">
          <i class="fad fa-plus" aria-hidden="true"></i>
          <input
            v-model="stepText"
            type="text"
            placeholder="Add a step"
            aria-label="Add a step"
            autocomplete="off"
            enterkeyhint="done"
            maxlength="80"
            data-test="step-input"
            @keyup.enter="addNewStep"
          />
          <button
            type="button"
            class="xp-app-btn qw-add"
            :disabled="!stepText.trim()"
            data-test="step-add"
            @click="addNewStep"
          >
            + step
          </button>
        </label>

        <div class="qw-nav">
          <button type="button" class="xp-app-btn xp-app-btn--ghost qw-btn qw-btn--back" data-test="back" @click="back">
            <i :class="['fad', position === 0 ? 'fa-door-open' : 'fa-arrow-left']" aria-hidden="true"></i>
            {{ position === 0 ? "Close" : "Back" }}
          </button>
          <button
            v-if="step !== 'ready'"
            type="button"
            class="xp-app-btn qw-btn qw-btn--next"
            :disabled="!canNext"
            data-test="next"
            @click="next"
          >
            Next
            <i class="fad fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button
            v-else
            type="button"
            class="xp-app-btn qw-btn qw-btn--next qw-btn--summon"
            :disabled="saving"
            data-test="summon"
            @click="summon"
          >
            <i class="fad fa-magic" aria-hidden="true"></i>
            {{ t("questWizard.summon") }}
          </button>
        </div>
      </div>
    </ion-footer>

    <!-- Fanfare reveal when a new quest is summoned: staged over the wizard modal -->
    <xp-hero-fanfare
      :open="showFanfare"
      :name="savedQuestTitle"
      :subtitle="savedQuestSubtitle"
      :title="t('questWizard.fanfare.title')"
      :action-text="t('questWizard.fanfare.action')"
      :portrait="savedQuestPortrait"
      @burst="playQuestAdventureSong"
      @done="finishQuestFanfare"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar, toastController } from "@ionic/vue";
import { format, isToday } from "date-fns";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpSpeakButton from "@/components/atoms/SpeakButton/XpSpeakButton.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { DAY_TOKENS } from "@/lib/engine/quests/QuestSchedule";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { parseDayKey } from "@/lib/services/quests/questPrefill";
import type { QuestPrefill } from "@/lib/services/quests/questPrefill";
import {
  addStep,
  bandOf,
  canAdvance,
  choreName,
  choreTiles,
  clampDifficulty,
  DAY_LABELS,
  defaultChore,
  draftProblem,
  dropStep,
  newDraft,
  pickChore,
  rewardsOf,
  searchChores,
  setWhen,
  sizesFor,
  stepGuide,
  STEP_ICON,
  suggestChore,
  TIME_CHOICES,
  toggleDay,
  toggleHero,
  typeChore,
  WHEN_CHOICES,
  whenLine,
  wizardSteps,
} from "@/lib/services/quests/questWizard";
import type { WizardChoice, WizardDraft, WizardTime, WizardWhen } from "@/lib/services/quests/questWizard";
import { saveWizardQuest } from "@/lib/services/quests/questWizardSave";
import { useCopy, useReadAloud, useVoice } from "@/hooks/useVoice";
import { formatQuestName } from "@/lib/utils/format";
import { useUserStore } from "@/lib/store/stores/user";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";
import { initialAvatar } from "@/lib/utils/initialAvatar";
import debug from "@/lib/utils/debug";
import { resolveGmAccess } from "@/router/_Guards/gm.guard";
import { tierBadge } from "../beastCard";

/**
 * The Quest Wizard (docs: board #1288): a full-screen, one-question-per-screen way for any player to add a quest from the
 * Calendar or the Beast Log. Big picture tiles, short words, Back / Next at the bottom. The rules (what a hero may make,
 * how the quest is built and saved) live in questWizard.ts; this file only holds the draft and draws it.
 */
const props = defineProps<{
  open: boolean;
  /** From the Calendar: the day, part of the day and hero on screen (questPrefill) */
  prefill?: QuestPrefill;
}>();

const emit = defineEmits<{
  close: [];
  saved: [quest: Achievement];
}>();

const { rootClass, rootStyle } = useAppSkin("quests");
const t = useCopy();
const { voice } = useVoice();
const { startAutoReading, stopReading } = useReadAloud();
const userStore = useUserStore();
const audioStore = useAudioStore();
const gameStore = useGameStore();
const globalProps = getCurrentInstance()?.appContext.config.globalProperties;

// Fanfare reveal for a newly summoned quest
const showFanfare = ref(false);
const savedQuest = ref<Achievement | null>(null);
const savedQuestTitle = ref("");
const savedQuestSubtitle = ref("");
const savedQuestPortrait = ref("");

// ---- Who is asking -------------------------------------------------------------------------------------------------

type Profile = (typeof userStore.users)[string];

const me = computed(() => String(userStore.currentUser.id ?? ""));
// Only a profile flagged as a Game Master (or a Game Master playing as a hero) gets the Game Master's wizard. Unlike the
// Game Master area, a device with no Game Master at all does not turn every hero into one: the safe rules apply.
const isGm = computed(() => {
  const access = resolveGmAccess(userStore);
  return access === "game-master" || access === "masquerade";
});
const band = computed(() => bandOf(userStore.users[me.value] ?? {}));
const heroes = computed(() => Object.values(userStore.users).filter((hero): hero is Profile => Boolean(hero?.id)));

const nameOf = (hero: Profile): string => hero.name?.nick || hero.name?.first || "Hero";
const avatarOf = (hero: Profile): string => {
  try {
    const avatar = globalProps?.$getUserAvatar?.(hero as never);
    if (avatar) return avatar;
  } catch (error) {
    debug.warn("[QuestWizard] a hero's avatar could not be read, using the initial", error);
  }
  return initialAvatar(hero.name?.first);
};

// ---- The draft -----------------------------------------------------------------------------------------------------

const blankDraft = (): WizardDraft => newDraft({ isGm: isGm.value, heroId: me.value, prefill: props.prefill });

const draft = ref<WizardDraft>(blankDraft());
const steps = computed(() => wizardSteps(isGm.value));
const position = ref(0);
const step = computed(() => steps.value[position.value]);
const saving = ref(false);

const content = ref<{ $el?: { scrollToTop?: (ms?: number) => Promise<void> } } | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const search = ref("");
const stepText = ref("");
const showAll = ref(false);

// Every time the wizard opens it starts fresh, with the Calendar's day and part of the day in place
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    draft.value = blankDraft();
    position.value = 0;
    search.value = "";
    stepText.value = "";
    showAll.value = false;
    saving.value = false;
    showFanfare.value = false;
    savedQuest.value = null;
    savedQuestTitle.value = "";
    savedQuestSubtitle.value = "";
    savedQuestPortrait.value = "";
  },
  { immediate: true }
);

watch(position, () => {
  void content.value?.$el?.scrollToTop?.(0);
});

const canNext = computed(() => canAdvance(step.value, draft.value));

// The guide's question in the hero's voice; the simple voice reads each one aloud as it appears (the speaker button
// reads it for everyone), and closing the wizard cuts the voice off
const guideLine = computed(() => stepGuide(step.value, voice.value));
watch(
  [() => props.open, guideLine],
  ([isOpen, line]) => {
    if (isOpen) startAutoReading(line);
  },
  { immediate: true }
);
watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (wasOpen && !isOpen) stopReading();
  }
);

// ---- 1. What -------------------------------------------------------------------------------------------------------

const PAGE_SIZE = 23;
const allTiles = computed(() => choreTiles(band.value));
const isSearching = computed(() => search.value.trim().length > 0);
const tiles = computed<LibraryEntry[]>(() => {
  if (isSearching.value) return searchChores(search.value);
  return showAll.value ? allTiles.value : allTiles.value.slice(0, PAGE_SIZE);
});
const canShowMore = computed(() => !isSearching.value && !showAll.value && allTiles.value.length > PAGE_SIZE);

const portrait = (entry: LibraryEntry | null): string | null => beastPortraitUrl(entry?.avatar);
const chosenPortrait = computed(() => portrait(draft.value.entry));

// "Something else": the beast it would fight (a match for the typed words, else the default one) wears a pencil
const ownEntry = computed(() => (isSearching.value ? suggestChore(search.value) ?? defaultChore() : null));
const ownPortrait = computed(() => portrait(ownEntry.value));
const ownLabel = computed(() => (isSearching.value ? search.value.trim() : t("questWizard.what.own")));

const isPicked = (entry: LibraryEntry): boolean => !draft.value.isOwn && String(draft.value.entry?.id) === String(entry.id);

const pick = (entry: LibraryEntry) => {
  play$fx("cursor");
  draft.value = pickChore(draft.value, entry);
  search.value = "";
  void content.value?.$el?.scrollToTop?.(200);
};

// Typing names the quest as the letters come, so Next wakes up as soon as there is a name
const onType = () => {
  draft.value = typeChore(draft.value, search.value);
};

const onOwnTile = () => {
  play$fx("cursor");
  if (isSearching.value) {
    draft.value = typeChore(draft.value, search.value);
    searchInput.value?.blur();
    return;
  }
  searchInput.value?.focus();
};

const onEnterSearch = () => {
  if (isSearching.value) searchInput.value?.blur();
};

// ---- 2. Steps ------------------------------------------------------------------------------------------------------

const drop = (index: number) => {
  play$fx("cursor");
  draft.value = dropStep(draft.value, index);
};

const addNewStep = () => {
  if (!stepText.value.trim()) return;
  play$fx("select");
  draft.value = addStep(draft.value, stepText.value);
  stepText.value = "";
};

// ---- 3. When -------------------------------------------------------------------------------------------------------

const startDay = computed(() => parseDayKey(draft.value.day));
// "Today" says today only when the day on screen is today; from another day of the Calendar it names that day
const whenLabel = (choice: WizardChoice<WizardWhen>): string => {
  if (choice.id !== "today" || !startDay.value || isToday(startDay.value)) return choice.label;
  return format(startDay.value, "EEE d");
};

const chooseWhen = (when: WizardWhen) => {
  play$fx("cursor");
  draft.value = setWhen(draft.value, when);
};
const chooseDay = (token: string) => {
  play$fx("cursor");
  draft.value = toggleDay(draft.value, token);
};
const chooseTime = (time: WizardTime) => {
  play$fx("cursor");
  draft.value = { ...draft.value, time };
};

// ---- 4. How big ----------------------------------------------------------------------------------------------------

const sizes = computed(() => sizesFor(isGm.value));
const difficulty = computed(() => clampDifficulty(draft.value.difficulty, isGm.value));
const rewards = computed(() => rewardsOf(difficulty.value));
const tier = computed(() => tierBadge(difficulty.value));

const chooseSize = (size: number) => {
  play$fx("cursor");
  draft.value = { ...draft.value, difficulty: size };
};

// ---- 5. Who --------------------------------------------------------------------------------------------------------

const chooseHero = (heroId: string) => {
  play$fx("cursor");
  draft.value = toggleHero(draft.value, heroId);
};

// ---- 6. Ready ------------------------------------------------------------------------------------------------------

const questName = computed(() => draft.value.name.trim());
const beastName = computed(() => (draft.value.entry ?? defaultChore()).name);
const whenText = computed(() => whenLine(draft.value));
const needsApproval = computed(() => !isGm.value || draft.value.requiresApproval);
const partyNames = computed(() => {
  const ids = draft.value.heroIds.length ? draft.value.heroIds : [me.value];
  return ids.map((id) => heroes.value.find((hero) => hero.id === id)).filter(Boolean).map((hero) => nameOf(hero as Profile)).join(", ");
});

const toggleApproval = () => {
  play$fx("cursor");
  draft.value = { ...draft.value, requiresApproval: !draft.value.requiresApproval };
};

// ---- Back, Next and Summon -----------------------------------------------------------------------------------------

const back = () => {
  play$fx("cursor");
  if (position.value === 0) {
    emit("close");
    return;
  }
  position.value -= 1;
};

const next = () => {
  if (!canNext.value) {
    play$fx("no");
    return;
  }
  play$fx("select");
  searchInput.value?.blur();
  position.value = Math.min(position.value + 1, steps.value.length - 1);
};

const say = async (header: string, message?: string) => {
  try {
    const toast = await toastController.create({
      header,
      message,
      duration: 2600,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch (error) {
    debug.warn("[QuestWizard] the toast could not be shown", error);
  }
};

const summon = async () => {
  if (saving.value) return;
  const problem = draftProblem(draft.value, voice.value);
  if (problem) {
    play$fx("no");
    void say(problem);
    return;
  }
  saving.value = true;
  try {
    const quest = await saveWizardQuest(draft.value, { isGm: isGm.value, creatorId: me.value });
    savedQuest.value = quest;
    savedQuestTitle.value = formatQuestName(quest.achievementName || questName.value);
    savedQuestSubtitle.value = beastName.value;
    savedQuestPortrait.value = chosenPortrait.value || "";
    showFanfare.value = true;
  } catch (error) {
    debug.warn("[QuestWizard] the quest could not be saved", error);
    play$fx("no");
    void say(t("questWizard.error.notSaved"));
  } finally {
    saving.value = false;
  }
};

const playQuestAdventureSong = () => {
  const rpgTheme = gameStore.theme?.rpg || "earthbound";
  const BGM = (audioStore.bgm?.$fx as any)?.rpg?.[rpgTheme]?.BGM;
  const hasNowLetsGoTrack = Boolean(BGM?.nowLetsGo);
  if (hasNowLetsGoTrack) {
    changeBGM(audioStore, {
      tracks: BGM.nowLetsGo,
      track: 0,
      startDelay: 0,
      repeat: false,
      saveBookmark: false,
    });
  }
};

const finishQuestFanfare = async () => {
  showFanfare.value = false;
  const quest = savedQuest.value;
  if (quest) {
    emit("saved", quest);
  }
  emit("close");
  await nextTick();
  if (quest) {
    // The name the quest saved under (title case), not the letters as typed
    const name = formatQuestName(quest.achievementName || questName.value);
    const waitsForApproval = needsApproval.value && !isGm.value;
    void say(t("questWizard.toast.header"), waitsForApproval ? t("questWizard.toast.approval", { name }) : name);
  }
};
</script>

<style lang="scss" scoped>
// A full-screen app sheet on the Quests purple; the kit's tokens give both skins (Retro / Modern).
.quest-wizard {
  background: transparent;
  --background: var(--xp-app-bg);
  --box-shadow: none;
  --width: 100%;
  --height: 100%;
  --border-radius: 0;

  &::part(content) {
    max-width: 700px;
    margin: 0 auto;
    background: var(--xp-app-bg);
  }
}

// ---- Progress dots and the guide -----------------------------------------------------------------------------------

.qw-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.qw-dot {
  width: 12px;
  height: 12px;
  border: 2px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-chip);
  background: transparent;
  transition: background 0.15s, transform 0.15s;

  &.is-done {
    background: var(--xp-app-accent);
    opacity: 0.6;
  }

  &.is-here {
    background: var(--xp-app-accent);
    transform: scale(1.3);
  }
}

.qw-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 14px 8px;
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.15rem;
  line-height: 1.2;
  text-align: center;
  text-transform: var(--xp-app-title-transform);

  i {
    color: var(--xp-app-accent);
    font-size: 1.5rem;
  }
}

.qw-section {
  padding: 4px 12px 8px;
}

.qw-sub {
  margin: 16px 2px 8px;
  color: var(--xp-app-text-dim);
  font-family: var(--xp-app-font-title);
  font-size: 0.9rem;
  text-transform: var(--xp-app-title-transform);
}

.qw-note,
.qw-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 14px 8px 0;
  color: var(--xp-app-text-dim);
  font-size: 0.9rem;
  text-align: center;
}

.qw-empty {
  flex-direction: column;
  padding: 24px 12px;

  i {
    color: var(--xp-app-accent);
    font-size: 2.4rem;
  }
}

// ---- Picture tiles -------------------------------------------------------------------------------------------------

.qw-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  &--2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.qw-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-height: 112px;
  padding: 8px 6px 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-title);
  font-size: 0.74rem;
  letter-spacing: 0.2px;
  line-height: 1.15;
  text-align: center;
  text-transform: var(--xp-app-title-transform);
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--xp-app-press);
  }

  &.is-picked {
    background: var(--xp-app-surface-2);
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 2px var(--xp-app-accent);
  }

  &__art {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 76px;
    overflow: hidden;
    background: var(--xp-app-tile-bg);
    border: var(--xp-app-tile-border);
    border-radius: var(--xp-app-radius-tile);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    i {
      color: var(--xp-app-tile-fg);
      font-size: 2rem;
    }

    &--round {
      width: 72px;
      height: 72px;
      margin: 0 auto;
      border-radius: 50%;
    }
  }

  &__pen {
    position: absolute;
    right: 4px;
    bottom: 4px;
    padding: 3px;
    background: var(--xp-app-accent);
    border-radius: 50%;
    color: var(--xp-app-on-accent) !important;
    font-size: 0.8rem !important;
  }

  &__label {
    display: -webkit-box;
    max-width: 100%;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow-wrap: anywhere;
  }

  &__check {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--xp-app-accent);
    background: var(--xp-app-bg);
    border-radius: 50%;
    font-size: 1.1rem;
  }

  // The big ones: when, time and size
  &--big {
    justify-content: center;
    min-height: 96px;
    gap: 8px;
    font-size: 0.9rem;
  }

  &__icon {
    color: var(--xp-app-accent);
    font-size: 2.2rem;
  }

  &--hero {
    min-height: 120px;
  }
}

.qw-chosen {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0 12px;
  padding: 6px 10px;
  background: var(--xp-app-surface);
  border: 2px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-tile);

  &__art {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    object-fit: contain;
    color: var(--xp-app-accent);
    font-size: 1.8rem;
    text-align: center;
    line-height: 44px;
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-family: var(--xp-app-font-title);
    font-size: 1rem;
    text-overflow: ellipsis;
    text-transform: var(--xp-app-title-transform);
    white-space: nowrap;
  }

  &__check {
    color: var(--xp-app-accent);
    font-size: 1.4rem;
  }
}

// ---- Steps ---------------------------------------------------------------------------------------------------------

.qw-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qw-step {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 4px 4px 4px 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);

  &__n {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    background: var(--xp-app-accent);
    border-radius: var(--xp-app-radius-chip);
    color: var(--xp-app-on-accent);
    font-family: var(--xp-app-font-title);
    font-size: 0.85rem;
    line-height: 28px;
    text-align: center;
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.95rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  &__x {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    background: transparent;
    border: 0;
    color: var(--xp-app-text-dim);
    cursor: pointer;
    font-size: 1.3rem;
    -webkit-tap-highlight-color: transparent;

    &:active {
      color: var(--xp-app-accent);
    }
  }
}

// ---- When: weekday chips -------------------------------------------------------------------------------------------

.qw-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
}

.qw-day {
  min-height: 48px;
  padding: 0;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-control);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-title);
  font-size: 0.72rem;
  text-transform: var(--xp-app-title-transform);
  -webkit-tap-highlight-color: transparent;

  &.is-picked {
    background: var(--xp-app-accent);
    border-color: var(--xp-app-accent);
    color: var(--xp-app-on-accent);
  }
}

// ---- Size: the rewards it pays -------------------------------------------------------------------------------------

.qw-rewards {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);

  &__label {
    color: var(--xp-app-text-dim);
    font-family: var(--xp-app-font-title);
    font-size: 0.85rem;
    text-transform: var(--xp-app-title-transform);
  }
}

// ---- Ready: the beast card -----------------------------------------------------------------------------------------

.qw-card {
  overflow: hidden;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);

  &__beast {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: 168px;
    background: radial-gradient(circle at 50% 70%, var(--xp-app-surface-2), #000);
  }

  &__portrait {
    height: 100%;
    max-width: 100%;
    object-fit: contain;
    color: var(--xp-app-accent);
    font-size: 5rem;
    line-height: 168px;
  }

  &__tier {
    position: absolute;
    top: 8px;
    left: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    background: var(--xp-app-accent);
    border-radius: var(--xp-app-radius-chip);
    color: var(--xp-app-on-accent);
    font-family: var(--xp-app-font-title);
    font-size: 0.78rem;
    text-transform: var(--xp-app-title-transform);
  }

  &__name {
    margin: 12px 14px 0;
    font-family: var(--xp-app-font-title);
    font-size: 1.25rem;
    line-height: 1.2;
    text-align: center;
    text-transform: var(--xp-app-title-transform);
  }

  &__sub {
    margin: 2px 14px 0;
    color: var(--xp-app-text-dim);
    font-size: 0.85rem;
    text-align: center;
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 16px;
    margin: 12px 14px 0;
    padding: 0;
    list-style: none;
    font-size: 0.9rem;

    li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    i {
      color: var(--xp-app-accent);
    }
  }

  &__rewards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 12px 12px 14px;
  }
}

.qw-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  margin-top: 12px;
  padding: 0 14px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-title);
  font-size: 0.95rem;
  text-transform: var(--xp-app-title-transform);
  -webkit-tap-highlight-color: transparent;

  i {
    color: var(--xp-app-accent);
    font-size: 1.5rem;
  }

  &.is-on {
    border-color: var(--xp-app-accent);
  }
}

// ---- Bottom: field, Back and Next ----------------------------------------------------------------------------------

.qw-footer::before {
  display: none;
}

.qw-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px calc(10px + var(--ion-safe-area-bottom, 0px));
  background: var(--xp-app-bar-bg);
  border-top: 1px solid var(--xp-app-line);

  .xp-app-search {
    height: 46px;
  }
}

.qw-add {
  flex: 0 0 auto;
  min-height: 34px;
}

.qw-nav {
  display: flex;
  gap: 10px;
}

.qw-btn {
  min-height: 56px;
  font-size: 1.05rem;

  i {
    font-size: 1.2rem;
  }

  &--back {
    flex: 1 1 0;
  }

  &--next {
    flex: 1.7 1 0;
  }

  &--summon {
    font-size: 1.2rem;
  }
}
</style>
