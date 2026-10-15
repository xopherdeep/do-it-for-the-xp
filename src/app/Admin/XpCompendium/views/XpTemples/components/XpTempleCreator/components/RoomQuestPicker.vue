
<template>
  <ion-modal
    :is-open="isOpen"
    class="room-quest-picker"
    @didDismiss="emit('close')"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box picker-toolbar">
        <ion-title>
          <span class="picker-title"><i class="fad fa-scroll-old mr-2"></i>{{ view === "form" ? "Make the quest" : "Pick a quest" }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <xp-close-button
            size="lg"
            color="light"
            @click="emit('close')"
          />
        </ion-buttons>
      </ion-toolbar>

      <!-- Search stays on top: the keyboard comes up from the bottom of the phone -->
      <div
        v-if="view === 'list'"
        class="search-bar"
      >
        <i
          class="fad fa-search"
          aria-hidden="true"
        ></i>
        <input
          v-model="search"
          type="search"
          class="search-input"
          placeholder="Search quests, beasts and heroes"
          aria-label="Search quests"
          enterkeyhint="search"
          autocomplete="off"
        />
        <button
          v-if="search"
          type="button"
          class="search-clear"
          aria-label="Clear the search"
          @click="search = ''"
        >
          <i class="fad fa-times-circle"></i>
        </button>
      </div>
    </ion-header>

    <ion-content
      ref="content"
      class="bg-slide bg-slide-equipment picker-content"
    >
      <!-- The list: quests, or the library's beasts -->
      <div
        v-if="view === 'list'"
        class="picker-page"
      >
        <p
          v-if="themeInfo && segment === 'theme'"
          class="theme-line"
        >
          <strong>{{ themeInfo.label }}</strong>
          {{ themeInfo.blurb }}
        </p>

        <ul
          v-if="segment !== 'library' && cards.length"
          class="picker-list"
        >
          <li
            v-for="entry in cards"
            :key="entry.card.key"
            :data-quest-id="entry.card.key"
          >
            <QuestRoomRow
              :card="entry.card"
              :selected="entry.card.key === picked"
              @select="pick(entry.card.key)"
            />
          </li>
        </ul>

        <ul
          v-else-if="segment === 'library' && libraryCards.length"
          class="picker-list"
        >
          <li
            v-for="entry in libraryCards"
            :key="entry.card.key"
          >
            <QuestRoomRow
              :card="entry.card"
              :selected="false"
              @select="startForm(entry.beast)"
            />
          </li>
        </ul>

        <p
          v-else
          class="empty-line"
        >{{ emptyText }}</p>

        <p
          v-if="segment === 'library' && libraryCards.length"
          class="picker-hint"
        >Tap a beast to make a quest from its chore.</p>
      </div>

      <!-- The small form: heroes and approval here, how often and how hard in the footer -->
      <div
        v-else-if="formBeast"
        class="picker-page"
      >
        <section
          v-if="formCard"
          class="form-hero"
        >
          <QuestRoomRow
            :card="formCard"
            :selectable="false"
          />
        </section>

        <section class="form-section">
          <h3 class="form-heading"><i class="fad fa-users"></i> Who does it</h3>
          <div
            class="hero-chips"
            role="group"
            aria-label="Heroes"
          >
            <button
              v-for="hero in heroOptions"
              :key="hero.id"
              type="button"
              class="hero-chip"
              :class="{ 'is-on': form.heroes.includes(hero.id) }"
              :aria-pressed="form.heroes.includes(hero.id)"
              @click="toggleHero(hero.id)"
            >
              <i :class="['fad', form.heroes.includes(hero.id) ? 'fa-check-circle' : 'fa-circle']"></i>
              {{ hero.name }}
            </button>
          </div>
          <p
            v-if="!heroOptions.length"
            class="picker-hint"
          >There are no heroes yet. Add a profile first.</p>
        </section>

        <section class="form-section">
          <h3 class="form-heading"><i class="fad fa-clipboard-list-check"></i> Approval</h3>
          <button
            type="button"
            class="approval-row"
            :class="{ 'is-on': form.requiresApproval }"
            :aria-pressed="form.requiresApproval"
            @click="form.requiresApproval = !form.requiresApproval"
          >
            <span>The Game Master approves it first</span>
            <i :class="['fad', form.requiresApproval ? 'fa-toggle-on' : 'fa-toggle-off', 'fa-2x']"></i>
          </button>
        </section>

        <p class="picker-hint">
          Rewards: {{ formRewards }}. {{ formTier }} room.
        </p>
        <p
          v-if="formProblem"
          class="form-problem"
          role="alert"
        >{{ formProblem }}</p>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border picker-footer">
      <div class="picker-dock">
        <!-- LIST: where the quests come from, then the size meter and Confirm -->
        <template v-if="view === 'list'">
          <div
            class="segments"
            role="group"
            aria-label="Where the quests come from"
          >
            <button
              v-for="option in segments"
              :key="option.id"
              type="button"
              class="segment"
              :class="{ 'is-on': option.id === segment }"
              :aria-pressed="option.id === segment"
              @click="chooseSegment(option.id)"
            >{{ option.label }}</button>
          </div>

          <div
            class="size-meter"
            :class="{ 'is-full': preview.isFull }"
            role="status"
          >
            <span class="size-label">{{ preview.label }}</span>
            <span
              class="size-bar"
              aria-hidden="true"
            >
              <span
                class="size-fill"
                :style="{ width: `${fillPercent}%` }"
              ></span>
            </span>
          </div>

          <div class="picker-actions">
            <button
              type="button"
              class="picker-confirm"
              :disabled="!picked"
              @click="confirm"
            >
              <i class="fad fa-check-circle"></i>
              {{ picked ? "Confirm quest" : "Pick a quest" }}
            </button>
          </div>
        </template>

        <!-- FORM: how often and how hard sit under the thumb -->
        <template v-else>
          <div
            class="segments"
            role="group"
            aria-label="How often"
          >
            <button
              v-for="option in SCHEDULES"
              :key="option.id"
              type="button"
              class="segment"
              :class="{ 'is-on': option.id === form.schedule }"
              :aria-pressed="option.id === form.schedule"
              @click="form.schedule = option.id"
            >{{ option.label }}</button>
          </div>

          <div class="difficulty">
            <button
              type="button"
              class="step-button"
              :disabled="difficultyIndex === 0"
              aria-label="Easier"
              @click="stepDifficulty(-1)"
            ><i class="fad fa-minus"></i></button>
            <div class="difficulty-body">
              <input
                v-model.number="difficultyIndex"
                type="range"
                class="difficulty-range"
                min="0"
                :max="LIBRARY_DIFFICULTIES.length - 1"
                step="1"
                aria-label="Difficulty"
              />
              <span class="difficulty-text">
                {{ difficultyName }} {{ form.difficulty }}
                <span class="chip-tier">{{ formTier }}</span>
              </span>
            </div>
            <button
              type="button"
              class="step-button"
              :disabled="difficultyIndex === LIBRARY_DIFFICULTIES.length - 1"
              aria-label="Harder"
              @click="stepDifficulty(1)"
            ><i class="fad fa-plus"></i></button>
          </div>

          <div class="picker-actions">
            <button
              type="button"
              class="picker-back"
              aria-label="Back"
              @click="backToList"
            >
              <i class="fad fa-chevron-left"></i>
              <span>Back</span>
            </button>
            <button
              type="button"
              class="picker-confirm"
              :disabled="Boolean(formProblem) || creating"
              @click="create"
            >
              <i class="fad fa-sparkles"></i>
              {{ creating ? "Making it..." : "Make the quest" }}
            </button>
          </div>
        </template>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from "vue";
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { play$fx } from "@/assets/fx";
  import type { Achievement } from "@/lib/databases/AchievementDb";
  import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
  import { DIFFICULTY_NAMES, TIER_NAMES } from "@/lib/services/quests/QuestLabels";
  import { nickOf, type FamilyMember } from "@/lib/services/quests/QuestList";
  import {
    LIBRARY_DIFFICULTIES,
    defaultLibraryForm,
    defaultPickerSegment,
    filterPickerRows,
    libraryCardOf,
    libraryChoices,
    libraryFormProblem,
    pickerSegmentsFor,
    previewSize,
    questCardOf,
    type LibraryQuestForm,
    type PickerRow,
    type PickerSegment,
  } from "@/lib/services/temples/questRoomPicker";
  import { questTier } from "@/lib/services/temples/questRooms";
  import type { TempleTheme, TempleThemeInfo } from "@/lib/services/temples/templeThemes";
  import QuestRoomRow from "./QuestRoomRow.vue";

  /**
   * The quest picker of the temple room editor (docs/Quest-Rooms-Spec.md section 9) as a full-screen sheet in the
   * Codex style: search on top, the quests (or the library's beasts) in the page, and under the thumb the three
   * sources, the temple size meter that previews the pick, and one Confirm. Everything it shows comes ready-made from
   * services/temples/questRoomPicker; "From the library" makes a quest through `createQuest` and picks it.
   */
  const props = withDefaults(
    defineProps<{
      isOpen?: boolean;
      /** Every live quest as a picker row */
      rows: PickerRow[];
      /** The quests themselves, for the library to know which beasts are taken */
      quests: Achievement[];
      heroes: FamilyMember[];
      /** The temple's theme, when it has one */
      theme?: TempleTheme;
      themeInfo?: TempleThemeInfo;
      /** The temple as saved and the part this room makes of it */
      size: { total: number; here: number };
      /** The quest the room holds now */
      selectedId?: string;
      /** Makes a quest from a library beast and resolves to its id */
      createQuest: (beast: LibraryBeast, form: LibraryQuestForm) => Promise<string>;
    }>(),
    { isOpen: false, theme: undefined, themeInfo: undefined, selectedId: "" }
  );

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "confirm", questId: string): void;
  }>();

  const SCHEDULES: ReadonlyArray<{ id: LibraryQuestForm["schedule"]; label: string }> = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
  ];

  const content = ref<{ $el?: { scrollToTop?: (duration?: number) => void } } | null>(null);
  const view = ref<"list" | "form">("list");
  const segment = ref<PickerSegment>(defaultPickerSegment(props.theme));
  const search = ref("");
  const picked = ref(props.selectedId);
  const creating = ref(false);

  const segments = computed(() => pickerSegmentsFor(props.theme));

  // Opens on the theme's quests (or all of them) with the room's own quest picked
  watch(
    () => props.isOpen,
    (open) => {
      if (!open) return;
      view.value = "list";
      segment.value = defaultPickerSegment(props.theme);
      search.value = "";
      picked.value = props.selectedId;
      creating.value = false;
    },
    { immediate: true }
  );

  const cards = computed(() =>
    filterPickerRows(props.rows, { segment: segment.value, theme: props.theme, search: search.value }).map((row) => ({
      row,
      card: questCardOf(row),
    }))
  );

  const libraryCards = computed(() =>
    segment.value === "library"
      ? libraryChoices(props.quests, { theme: props.theme, search: search.value }).map((beast) => ({
          beast,
          card: libraryCardOf(beast),
        }))
      : []
  );

  const EMPTY_TEXT_OF_SEGMENT: Partial<Record<PickerSegment, string>> = {
    library: "Every beast here already has a quest. Try All quests.",
    theme: "No quest fits this temple's theme yet. Try All quests, or make one From the library.",
  };
  const emptyText = computed(() => {
    const isSearching = Boolean(search.value.trim());
    if (isSearching) return "Nothing matches that search.";
    return EMPTY_TEXT_OF_SEGMENT[segment.value] ?? "No quests yet. Make one From the library, or in the Compendium.";
  });

  const chooseSegment = (id: PickerSegment) => {
    const isSameSegment = id === segment.value;
    if (isSameSegment) return;
    play$fx("cursor");
    segment.value = id;
    content.value?.$el?.scrollToTop?.(0);
  };

  const pick = (id: string) => {
    play$fx("cursor");
    picked.value = id;
  };

  // ---- The size meter ----
  const pickedRow = computed(() => props.rows.find((row) => row.id === picked.value));
  const preview = computed(() => previewSize(props.size, pickedRow.value?.difficulty));
  const fillPercent = computed(() => Math.min(100, Math.round((preview.value.after / preview.value.full) * 100)));

  const confirm = () => {
    if (!picked.value) return;
    play$fx("select");
    emit("confirm", picked.value);
  };

  // ---- From the library: the small form ----
  const formBeast = ref<LibraryBeast | null>(null);
  const form = ref<LibraryQuestForm>(defaultLibraryForm([]));

  const heroOptions = computed(() =>
    props.heroes.map((hero) => ({ id: String(hero.id), name: nickOf(hero, "Hero") })).filter((hero) => hero.id !== "undefined")
  );

  const startForm = (beast: LibraryBeast) => {
    play$fx("select");
    formBeast.value = beast;
    form.value = defaultLibraryForm(heroOptions.value.map((hero) => hero.id));
    view.value = "form";
    content.value?.$el?.scrollToTop?.(0);
  };

  const backToList = () => {
    play$fx("cursor");
    view.value = "list";
  };

  const toggleHero = (id: string) => {
    play$fx("cursor");
    const on = form.value.heroes.includes(id);
    form.value.heroes = on ? form.value.heroes.filter((hero) => hero !== id) : [...form.value.heroes, id];
  };

  const difficultyIndex = computed({
    get: () => Math.max(0, LIBRARY_DIFFICULTIES.indexOf(form.value.difficulty)),
    set: (index: number) => {
      const step = LIBRARY_DIFFICULTIES[Math.min(Math.max(0, Number(index) || 0), LIBRARY_DIFFICULTIES.length - 1)];
      form.value.difficulty = step;
    },
  });
  const stepDifficulty = (by: number) => {
    play$fx("cursor");
    difficultyIndex.value = difficultyIndex.value + by;
  };

  const difficultyName = computed(() => DIFFICULTY_NAMES[form.value.difficulty] ?? "");
  const formTier = computed(() => TIER_NAMES[questTier(form.value.difficulty)]);
  const formRewards = computed(() => {
    const d = form.value.difficulty;
    return `${(d * 100).toLocaleString()} XP, ${d * 10} GP, ${d} AP`;
  });
  const formProblem = computed(() => libraryFormProblem(form.value));
  const formCard = computed(() => (formBeast.value ? libraryCardOf(formBeast.value) : null));

  /** Makes the quest, then shows it picked among the theme's quests, ready to Confirm. */
  const create = async () => {
    const beast = formBeast.value;
    const isCreateBlocked = !beast || !!formProblem.value || creating.value;
    if (isCreateBlocked) return;
    creating.value = true;
    try {
      const id = await props.createQuest(beast, form.value);
      play$fx("select");
      picked.value = id;
      view.value = "list";
      segment.value = defaultPickerSegment(props.theme);
      search.value = "";
      await nextTick();
      document.querySelector(`.room-quest-picker [data-quest-id="${id}"]`)?.scrollIntoView({ block: "center" });
    } finally {
      creating.value = false;
    }
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  $body-backing: rgba(20, 6, 28, 0.55);
  $divider: rgba(231, 230, 179, 0.25);

  .room-quest-picker {
    --width: 100%;
    --height: 100%;
    --max-width: 100%;
    --max-height: 100%;
    --border-radius: 0;
    --background: #{$eb-color-dark-purple};
    --box-shadow: none;
  }

  .picker-toolbar {
    --color: #{$eb-color-cream};

    ion-title {
      text-align: left;
      padding-inline-start: 8px;
    }
  }

  .picker-title {
    font-family: $eb-font-title;
    color: $eb-color-pale-yellow;
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  /* ---- Search, on top ---- */
  .search-bar {
    margin: 0;
    padding: 8px 16px 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: $eb-color-dark-purple;
    border-bottom: 1px solid $divider;

    > i {
      font-size: 1.1rem;
      --fa-primary-color: #{$eb-color-pale-yellow};
      --fa-secondary-color: #{$eb-color-pale-yellow};
      --fa-secondary-opacity: 0.5;
    }
  }

  .search-input {
    flex: 1;
    min-width: 0;
    height: 42px;
    padding: 0 12px;
    font-family: $eb-font-status;
    font-size: 1.05rem;
    color: $eb-color-cream;
    background: $body-backing;
    border: 2px solid rgba(231, 230, 179, 0.3);
    border-radius: 6px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;

    &::placeholder {
      color: rgba(231, 230, 179, 0.5);
    }

    &:focus {
      border-color: $eb-color-pale-yellow;
    }
  }

  .search-clear {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    background: none;
    border: none;
    color: $eb-color-cream;
    font-size: 1.3rem;
    cursor: pointer;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }
  }

  /* ---- The page ---- */
  .picker-content {
    --padding-top: 10px;
    --padding-bottom: 20px;
    --color: #{$eb-color-cream};
    color: $eb-color-cream;
  }

  .picker-page {
    margin: 0 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .theme-line {
    margin: 0;
    padding: 8px 12px;
    font-size: 0.95rem;
    line-height: 1.35;
    border-radius: 8px;
    background: $body-backing;

    strong {
      display: block;
      font-family: $eb-font-status;
      font-weight: normal;
      font-size: 1.05rem;
      color: $eb-color-pale-yellow;
    }
  }

  .picker-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .empty-line,
  .picker-hint {
    margin: 0;
    font-size: 1rem;
    line-height: 1.4;
    text-align: center;
    opacity: 0.85;
  }

  .empty-line {
    padding: 28px 12px;
    font-family: $eb-font-status;
    font-size: 1.1rem;
  }

  /* ---- The form ---- */
  .form-section {
    display: flex;
    flex-direction: column;
  }

  .form-heading {
    margin: 0 0 8px;
    padding: 0 2px 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid $divider;
    font-family: $eb-font-status;
    font-weight: normal;
    font-size: 0.9rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: $eb-color-pale-yellow;
  }

  .hero-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hero-chip {
    min-height: 44px;
    padding: 6px 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: $eb-font-status;
    font-size: 1.05rem;
    color: $eb-color-cream;
    background: $body-backing;
    border: 2px solid rgba(231, 230, 179, 0.25);
    border-radius: 22px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
      --fa-secondary-opacity: 0.4;
    }

    &.is-on {
      color: $eb-color-mint-green;
      border-color: $eb-color-mint-green;
      background: rgba(128, 216, 144, 0.14);
    }
  }

  .approval-row {
    width: 100%;
    min-height: 52px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    font-family: $eb-font-status;
    font-size: 1.05rem;
    color: $eb-color-cream;
    background: $body-backing;
    border: 2px solid rgba(231, 230, 179, 0.25);
    border-radius: 8px;
    cursor: pointer;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
      --fa-secondary-opacity: 0.4;
    }

    &.is-on {
      border-color: $eb-color-pale-yellow;

      i {
        color: $eb-color-mint-green;
      }
    }
  }

  .form-problem {
    margin: 0;
    text-align: center;
    font-family: $eb-font-status;
    color: #ff9a9a;
  }

  /* ---- Footer: the sources, the size meter and Confirm, under the thumb ---- */
  .picker-footer {
    background: $eb-color-dark-purple;
    border-top: 3px solid $eb-color-pale-yellow;
  }

  .picker-dock {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
    background: $eb-color-dark-purple;
  }

  .segments {
    display: flex;
    gap: 6px;
  }

  .segment {
    flex: 1 1 0;
    min-height: 46px;
    padding: 4px 6px;
    font-family: $eb-font-status;
    font-size: 0.9rem;
    line-height: 1.15;
    color: $eb-color-cream;
    background: $body-backing;
    border: 2px solid rgba(231, 230, 179, 0.25);
    border-radius: 6px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &.is-on {
      color: $eb-color-dark-purple;
      background: $eb-color-pale-yellow;
      border-color: $eb-color-pale-yellow;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .size-meter {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-family: $eb-font-status;
    font-size: 1rem;
    color: $eb-color-cream;
    text-align: center;

    &.is-full .size-fill {
      background: $eb-color-mint-green;
    }
  }

  .size-bar {
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background: rgba(231, 230, 179, 0.18);
  }

  .size-fill {
    display: block;
    height: 100%;
    background: $eb-color-sky-blue;
    transition: width 160ms steps(4);
  }

  .picker-actions {
    display: flex;
    gap: 12px;
  }

  .picker-back,
  .picker-confirm {
    min-height: 56px;
    padding: 8px 14px;
    font-family: $eb-font-status;
    font-size: 1.2rem;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }

    &:active:not(:disabled) {
      transform: translateY(2px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .picker-back {
    flex: 0 0 auto;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-slate, 0 0 0 5px rgba(104, 208, 184, 0.35);
  }

  .picker-confirm {
    flex: 1;
    color: $eb-color-dark-purple;
    background: $eb-color-pale-yellow;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-medium-purple, 0 0 0 5px $eb-color-minty-blue, 0 4px 0 5px rgba(0, 0, 0, 0.5);
  }

  /* ---- The form's difficulty control ---- */
  .difficulty {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-button {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-slate;
    cursor: pointer;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .difficulty-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .difficulty-range {
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: $eb-color-pale-yellow;
    cursor: pointer;
  }

  .difficulty-text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: $eb-font-status;
    font-size: 1.05rem;
    color: #fff;
  }

  .chip-tier {
    padding: 1px 7px;
    border-radius: 6px;
    font-size: 0.75rem;
    color: $eb-color-dark-purple;
    background: $eb-color-minty-blue;
  }

  @media (prefers-reduced-motion: reduce) {
    .size-fill {
      transition: none;
    }
  }
</style>
