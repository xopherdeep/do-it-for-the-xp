<template>
  <!-- The Game Master's Power form as the shared wizard: What is it? > What does it do? > What does it cost? > Save -->
  <ion-page :class="[$options.name, ...rootClass]" :style="rootStyle">
    <xp-wizard-shell
      v-if="loaded"
      v-model:index="position"
      :steps="steps"
      :draft="ability"
      :title="id ? 'Edit Power' : 'New Power'"
      icon="book-spells"
      verb="Save"
      verb-icon="save"
      :busy="saving"
      @close="goBack"
      @submit="saveAbility"
    >
      <!-- 1. WHAT IS IT: the icon, the kind and the description; the name sits at the bottom, above Back / Next -->
      <template #what>
        <section class="pw-section" data-test="step-what">
          <button type="button" class="pw-hero" data-test="icon-button" @click="openIconPicker">
            <span class="pw-hero__tile"><i :class="iconClass" aria-hidden="true"></i></span>
            <span class="pw-hero__text">
              <span class="pw-hero__name" data-test="hero-name">{{ ability.name.trim() || "Name it below" }}</span>
              <span class="pw-hero__hint"><i class="fad fa-icons" aria-hidden="true"></i> Tap to change the icon</span>
            </span>
          </button>

          <h2 class="pw-sub">What kind is it?</h2>
          <div class="pw-kinds" role="radiogroup" aria-label="What kind is it?" data-cy="ability-kind">
            <button
              v-for="kind in KIND_CHOICES"
              :key="kind.id"
              type="button"
              role="radio"
              class="pw-kind"
              :class="{ 'is-picked': ability.type === kind.id }"
              :aria-checked="ability.type === kind.id"
              :data-test="`kind-${kind.id}`"
              @click="chooseKind(kind.id)"
            >
              <i :class="['fad', `fa-${kind.icon}`, 'pw-kind__icon']" aria-hidden="true"></i>
              <span class="pw-kind__label">{{ kind.label }}</span>
              <span class="pw-kind__hint">{{ kind.hint }}</span>
            </button>
          </div>

          <h2 class="pw-sub">Say what it is</h2>
          <textarea
            v-model="ability.description"
            class="pw-text"
            rows="3"
            maxlength="240"
            placeholder="Pick the family movie"
            aria-label="Description"
            data-test="description"
          ></textarea>
        </section>
      </template>

      <!-- 2. WHAT DOES IT DO: the fields follow the kind -->
      <template #does>
        <section v-if="isRealLife" class="pw-section" data-test="step-does">
          <h2 class="pw-sub">On the quest board</h2>
          <xp-power-choices
            data-cy="ability-board-effect"
            layout="rows"
            label="On the quest board"
            :choices="boardChoices"
            :model-value="boardEffect"
            @update:model-value="setBoardEffect"
          />
          <p class="pw-note">None is a privilege you grant yourself, like a movie night.</p>

          <h2 class="pw-sub">Timer</h2>
          <xp-power-counter
            label="Minutes once cast"
            hint="A countdown shows and says when time is up. 0 means no timer."
            unit="min"
            :step="15"
            :max="MAX_TIMER_MINUTES"
            :model-value="ability.timerMinutes ?? 0"
            data-test="timer-minutes"
            @update:model-value="setTimerMinutes"
          />
        </section>

        <section v-else class="pw-section" data-test="step-does">
          <h2 class="pw-sub">Which class can cast it?</h2>
          <xp-power-choices
            data-cy="ability-class"
            label="Which class can cast it?"
            :choices="classChoices"
            :model-value="classPick?.name ?? 'none'"
            @update:model-value="setClass"
          />
          <xp-power-counter
            v-if="classPick"
            class="pw-gap"
            label="Class level"
            hint="The lowest level in that class"
            :min="1"
            :max="99"
            :model-value="classPick.level"
            data-test="class-level"
            @update:model-value="setClassLevel"
          />
          <xp-power-counter
            class="pw-gap"
            label="Hero level"
            hint="0 means any level"
            :max="99"
            :model-value="heroLevel"
            data-test="hero-level"
            @update:model-value="setHeroLevel"
          />

          <h2 class="pw-sub">In battle</h2>
          <xp-power-choices
            data-cy="ability-battle-effect"
            layout="rows"
            label="In battle"
            :choices="battleChoices"
            :model-value="battleEffect"
            @update:model-value="setBattleEffect"
          />

          <h2 class="pw-sub">Grows with</h2>
          <xp-power-choices
            data-cy="ability-attribute"
            label="Grows with"
            :choices="attributeChoices"
            :model-value="scaling.attribute"
            @update:model-value="setAttribute"
          />
          <xp-power-counter
            v-if="scaling.attribute !== 'none'"
            class="pw-gap"
            label="Each point adds"
            hint="How much each point of that attribute strengthens the Power"
            unit="%"
            :step="5"
            :max="100"
            :model-value="Math.round(scaling.rate * 100)"
            data-test="rate"
            @update:model-value="setRate"
          />
        </section>
      </template>

      <!-- 3. WHAT DOES IT COST -->
      <template #cost>
        <section class="pw-section" data-test="step-cost">
          <xp-power-counter
            label="MP to cast"
            hint="Magic Points spent each time it is used"
            unit="MP"
            :max="999"
            :model-value="ability.mpCost"
            data-test="mp"
            @update:model-value="setMp"
          />
          <xp-power-counter
            class="pw-gap"
            label="AP needed"
            hint="Ability Points the hero has earned. They are not spent."
            unit="AP"
            :max="99999"
            :model-value="ability.apRequirement.amount"
            data-test="ap"
            @update:model-value="setAp"
          />

          <h2 class="pw-sub">Count the AP over</h2>
          <xp-power-choices
            data-cy="ability-ap-period"
            label="Count the AP over"
            :choices="AP_PERIOD_CHOICES"
            :model-value="ability.apRequirement.period"
            @update:model-value="setApPeriod"
          />

          <h2 class="pw-sub">How often can it be used?</h2>
          <xp-power-choices
            data-cy="ability-frequency"
            label="How often can it be used?"
            :choices="FREQUENCY_CHOICES"
            :model-value="ability.frequency"
            @update:model-value="setFrequency"
          />
        </section>
      </template>

      <!-- 4. READY: what was chosen; a tap on a line goes back to the step that owns it -->
      <template #ready>
        <section class="pw-section" data-test="step-ready">
          <xp-app-section>
            <xp-app-row
              v-for="row in summary"
              :key="row.id"
              :title="row.value"
              :subtitle="row.detail ?? row.label"
              :icon="row.icon"
              :data-test="`row-${row.id}`"
              @click="jumpTo(row.step)"
            >
              <template v-if="row.id === 'name'" #leading>
                <i :class="iconClass" aria-hidden="true"></i>
              </template>
            </xp-app-row>
          </xp-app-section>
        </section>
      </template>

      <!-- The step's field sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <label v-if="asked.id === 'what'" class="xp-app-search" data-test="name-field">
          <i class="fad fa-signature" aria-hidden="true"></i>
          <input
            v-model="ability.name"
            type="text"
            placeholder="Name the Power"
            aria-label="Name"
            maxlength="40"
            autocomplete="off"
            enterkeyhint="done"
            data-test="name"
            @keyup.enter="dropKeyboard"
          />
        </label>
        <label v-else-if="asked.id === 'does' && isInGame" class="xp-app-search" data-test="effect-field">
          <i class="fad fa-sparkles" aria-hidden="true"></i>
          <input
            v-model="ability.effect"
            type="text"
            placeholder="What happens when it is used"
            aria-label="Effect"
            maxlength="120"
            autocomplete="off"
            enterkeyhint="done"
            data-test="effect"
            @keyup.enter="dropKeyboard"
          />
        </label>
      </template>
    </xp-wizard-shell>

    <!-- The icon picker rises from the bottom (a sheet: swipe it down to leave) and brings the icon back with `select`.
         The top breakpoint is 1: a sheet that tops out lower clips the bottom of its content, where Confirm sits. -->
    <ion-modal :is-open="showIconPicker" :initial-breakpoint="1" :breakpoints="[0, 1]" @didDismiss="closeIconPicker">
      <ion-header>
        <ion-toolbar>
          <ion-title>Pick an icon</ion-title>
          <ion-buttons slot="end">
            <ion-button aria-label="Close" data-test="icon-close" @click="closeIconPicker">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <xp-icon-picker :initial-icon="ability.icon" :initial-prefix="ability.iconPrefix" @select="onIconPicked" />
    </ion-modal>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { toastController } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import { v4 as uuidv4 } from "uuid";
  import ionic from "@/lib/mixins/ionic";
  import { play$fx } from "@/assets/fx";
  import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
  import XpIconPicker from "@/components/atoms/Icon/XpIconPicker.vue";
  import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
  import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
  import { AbilityType } from "@/hooks/abilities/abilityConstants";
  import type { Ability } from "@/hooks/abilities/abilityConstants";
  import type { PowerBoardEffectId } from "@/types/abilities";
  import type { BattleEffectId } from "@/lib/services/battle/BattleEffects";
  import { BATTLE_EFFECT_OPTIONS, battleEffectOf } from "@/lib/services/battle/BattlePowers";
  import { POWER_BOARD_EFFECT_OPTIONS, boardEffectOfPower } from "@/lib/services/abilities/PowerBoardEffects";
  import { lastIndex } from "@/lib/services/wizard/wizardSteps";
  import { MAX_TIMER_MINUTES } from "@/lib/services/abilities/PowerTimers";
  import debug from "@/lib/utils/debug";
  import XpPowerChoices from "./XpPowerChoices.vue";
  import XpPowerCounter from "./XpPowerCounter.vue";
  import {
    AP_PERIOD_CHOICES,
    ATTRIBUTE_CHOICES,
    CLASS_CHOICES,
    FREQUENCY_CHOICES,
    KIND_CHOICES,
    blankPower,
    characterLevelOf,
    classRequirementOf,
    finishedPower,
    iconClassOf,
    loadedPower,
    powerSummary,
    powerWizardSteps,
    scalingOf,
    withApRequirement,
    withCharacterLevel,
    withClassRequirement,
    withPickedIcon,
    withScaling,
  } from "../powerWizard";
  import type { PickedIcon, PowerChoice, PowerDraft, PowerStepId } from "../powerWizard";

  const asChoices = <Id extends string>(options: { value: Id; label: string }[]): PowerChoice[] =>
    options.map((option) => ({ id: option.value, label: option.label }));

  /** "None" leads each list that can be left empty */
  const withNone = (label: string, choices: PowerChoice[]): PowerChoice[] => [{ id: "none", label }, ...choices];

  export default defineComponent({
    name: "XpCreateUpdateAbility",
    mixins: [ionic],
    components: { XpWizardShell, XpIconPicker, XpPowerChoices, XpPowerCounter },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const id = computed(() => route.params.id as string | undefined);
      // The Power tree is the family's: Real Life privileges and In-Game spells share one record, kept in AbilitiesDb
      const abilitiesDb = new AbilitiesDb(abilitiesStorage);
      // Powers wear the Spells blue, the same as the hero's Powers app
      const { rootClass, rootStyle } = useAppSkin("spells");

      // ---- The draft is the Ability itself ---------------------------------------------------------------------
      const ability = ref<PowerDraft>(blankPower());
      const steps = powerWizardSteps();
      const position = ref(0);
      // A new Power is ready at once; an edit waits for its record and then opens on the summary
      const loaded = ref(!id.value);
      const saving = ref(false);
      const showIconPicker = ref(false);

      const isRealLife = computed(() => ability.value.type === AbilityType.RealLife);
      const isInGame = computed(() => ability.value.type === AbilityType.InGame);
      const iconClass = computed(() => iconClassOf(ability.value));
      const summary = computed(() => powerSummary(ability.value));

      // What each step shows right now: the preset's own effect counts until the Game Master picks another
      const boardEffect = computed<string>(() => boardEffectOfPower(ability.value) ?? "none");
      const battleEffect = computed<string>(() => battleEffectOf(ability.value) ?? "none");
      const classPick = computed(() => classRequirementOf(ability.value));
      const heroLevel = computed(() => characterLevelOf(ability.value));
      const scaling = computed(() => scalingOf(ability.value));

      const boardChoices = asChoices(POWER_BOARD_EFFECT_OPTIONS);
      const battleChoices = asChoices(BATTLE_EFFECT_OPTIONS);
      const classChoices = withNone("Any class", CLASS_CHOICES);
      const attributeChoices = withNone("Nothing", ATTRIBUTE_CHOICES);

      const patch = (changes: Partial<Ability>) => {
        ability.value = { ...ability.value, ...changes };
      };

      // ---- Step 1 ----------------------------------------------------------------------------------------------
      const chooseKind = (type: Ability["type"]) => {
        if (ability.value.type === type) return;
        play$fx("cursor");
        patch({ type });
      };

      const openIconPicker = () => {
        play$fx("openMenu");
        showIconPicker.value = true;
      };
      const closeIconPicker = () => {
        showIconPicker.value = false;
      };
      // The picker confirms with `select` (a modal opened by name could never bring this back)
      const onIconPicked = (picked: PickedIcon) => {
        ability.value = withPickedIcon(ability.value, picked);
        play$fx("select");
        closeIconPicker();
      };

      // The name and effect fields end on the keyboard's Done: close the keyboard and keep the screen
      const dropKeyboard = (event: Event) => {
        (event.target as HTMLElement | null)?.blur?.();
      };

      // ---- Step 2 ----------------------------------------------------------------------------------------------
      const setBoardEffect = (value: string) => patch({ boardEffect: value as PowerBoardEffectId | "none" });
      const setTimerMinutes = (timerMinutes: number) => patch({ timerMinutes });
      const setBattleEffect = (value: string) => patch({ battleEffect: value as BattleEffectId | "none" });
      const setClass = (name: string) => {
        ability.value = withClassRequirement(ability.value, name, classPick.value?.level ?? 1);
      };
      const setClassLevel = (level: number) => {
        if (classPick.value) ability.value = withClassRequirement(ability.value, classPick.value.name, level);
      };
      const setHeroLevel = (level: number) => {
        ability.value = withCharacterLevel(ability.value, level);
      };
      const setAttribute = (name: string) => {
        ability.value = withScaling(ability.value, name);
      };
      const setRate = (percent: number) => {
        ability.value = withScaling(ability.value, scaling.value.attribute, percent / 100);
      };

      // ---- Step 3 ----------------------------------------------------------------------------------------------
      const setMp = (mpCost: number) => patch({ mpCost });
      const setAp = (amount: number) => {
        ability.value = withApRequirement(ability.value, { amount });
      };
      const setApPeriod = (period: string) => {
        ability.value = withApRequirement(ability.value, { period: period as Ability["apRequirement"]["period"] });
      };
      const setFrequency = (frequency: string) => patch({ frequency: frequency as Ability["frequency"] });

      // ---- Step 4 ----------------------------------------------------------------------------------------------
      const jumpTo = (stepId: PowerStepId) => {
        const at = steps.findIndex((step) => step.id === stepId);
        if (at < 0) return;
        play$fx("cursor");
        position.value = at;
      };

      const goBack = () => {
        router.push("/game-master/compendium/abilities");
      };

      // Save once, here, on the last step's verb
      const saveAbility = async () => {
        if (saving.value) return;
        const abilityToSave = finishedPower(ability.value);
        if (!abilityToSave.id) {
          // New ability
          abilityToSave.id = uuidv4();
        }

        saving.value = true;
        try {
          // Save to DB
          await abilitiesDb.setAbility(abilityToSave);
          play$fx("select");

          // Show success toast
          const toast = await toastController.create({
            message: `Ability "${abilityToSave.name}" saved successfully!`,
            duration: 2000,
            color: "success",
            position: "bottom",
          });
          toast.present();

          // Navigate back
          goBack();
        } catch (error) {
          debug.error("Error saving ability:", error);
          play$fx("no");

          // Show error toast
          const toast = await toastController.create({
            message: "Error saving ability. Please try again.",
            duration: 3000,
            color: "danger",
            position: "bottom",
          });
          toast.present();
        } finally {
          saving.value = false;
        }
      };

      // An edit opens on the summary with the dots tappable back; a Power that has no name (an id that is not there) starts over
      onMounted(async () => {
        if (!id.value) return;
        try {
          ability.value = loadedPower(await abilitiesDb.getAbilityById(id.value));
          position.value = ability.value.name.trim() ? lastIndex(steps, ability.value) : 0;
        } catch (error) {
          debug.error("Error loading ability:", error);
        } finally {
          loaded.value = true;
        }
      });

      return {
        id,
        ability,
        steps,
        position,
        loaded,
        saving,
        showIconPicker,
        isRealLife,
        isInGame,
        iconClass,
        summary,
        boardEffect,
        battleEffect,
        classPick,
        heroLevel,
        scaling,
        boardChoices,
        battleChoices,
        classChoices,
        attributeChoices,
        rootClass,
        rootStyle,
        KIND_CHOICES,
        MAX_TIMER_MINUTES,
        AP_PERIOD_CHOICES,
        FREQUENCY_CHOICES,
        closeOutline,
        chooseKind,
        openIconPicker,
        closeIconPicker,
        onIconPicked,
        setTimerMinutes,
        dropKeyboard,
        setBoardEffect,
        setBattleEffect,
        setClass,
        setClassLevel,
        setHeroLevel,
        setAttribute,
        setRate,
        setMp,
        setAp,
        setApPeriod,
        setFrequency,
        jumpTo,
        goBack,
        saveAbility,
      };
    },
  });
</script>

<style lang="scss" scoped>
  // The body of every step: the kit's tokens give both skins (Retro / Modern), the accent is the Spells blue
  .pw-section {
    padding: 4px 12px 8px;
  }

  .pw-sub {
    margin: 16px 2px 8px;
    color: var(--xp-app-text-dim);
    font-family: var(--xp-app-font-title);
    font-size: 0.9rem;
    text-transform: var(--xp-app-title-transform);
  }

  .pw-note {
    margin: 10px 4px 0;
    color: var(--xp-app-text-dim);
    font-size: 0.85rem;
    line-height: 1.3;
    text-align: center;
  }

  .pw-gap {
    margin-top: 10px;
  }

  // The icon and the name as the hero will meet them; a tap changes the icon
  .pw-hero {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    margin-top: 6px;
    padding: 12px;
    background: var(--xp-app-surface);
    border: 2px solid var(--xp-app-accent);
    border-radius: var(--xp-app-radius-tile);
    color: var(--xp-app-text);
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;

    &:active {
      background: var(--xp-app-press);
    }

    &__tile {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: var(--xp-app-tile-bg);
      border: var(--xp-app-tile-border);
      border-radius: var(--xp-app-radius-tile);

      i {
        color: var(--xp-app-tile-fg);
        font-size: 2.2rem;
      }
    }

    &__text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    &__name {
      overflow: hidden;
      font-family: var(--xp-app-font-title);
      font-size: 1.15rem;
      text-overflow: ellipsis;
      text-transform: var(--xp-app-title-transform);
      white-space: nowrap;
    }

    &__hint {
      color: var(--xp-app-text-dim);
      font-size: 0.85rem;

      i {
        margin-right: 4px;
        color: var(--xp-app-accent);
      }
    }
  }

  // Real Life or In-Game: two big tiles, each says what it is
  .pw-kinds {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .pw-kind {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 130px;
    padding: 12px 8px;
    background: var(--xp-app-surface);
    border: var(--xp-app-section-border);
    border-radius: var(--xp-app-radius-tile);
    color: var(--xp-app-text);
    cursor: pointer;
    font-family: var(--xp-app-font-title);
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

    &__icon {
      color: var(--xp-app-accent);
      font-size: 2rem;
    }

    &__label {
      font-size: 1rem;
    }

    &__hint {
      color: var(--xp-app-text-dim);
      font-family: var(--xp-app-font-body);
      font-size: 0.78rem;
      line-height: 1.25;
      text-transform: none;
    }
  }

  .pw-text {
    display: block;
    width: 100%;
    padding: 10px 12px;
    background: var(--xp-app-surface);
    border: var(--xp-app-section-border);
    border-radius: var(--xp-app-radius-control);
    box-sizing: border-box;
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-body);
    font-size: 1rem;
    outline: none;
    resize: none;

    &::placeholder {
      color: var(--xp-app-text-dim);
    }

    &:focus {
      border-color: var(--xp-app-accent);
    }
  }
</style>
