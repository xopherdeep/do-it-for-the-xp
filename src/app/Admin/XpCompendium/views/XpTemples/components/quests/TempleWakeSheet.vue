<template>
  <ion-modal :is-open="isOpen" class="wake-modal" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>
          <i class="fad fa-sunrise mr-2"></i>
          Wake quests
        </ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" class="close-wake" aria-label="Close" @click="emit('close')">
            <i class="fas fa-times"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="wake-content">
      <!-- After the wake -->
      <div class="wake-report" v-if="report">
        <p class="report-line">
          <i class="fad fa-sunrise" aria-hidden="true"></i>
          <template v-if="report.woken > 0">
            Woke {{ report.woken }} quest{{ report.woken !== 1 ? "s" : "" }} for {{ report.heroes }}.
          </template>
          <template v-else>Nothing new to wake.</template>
        </p>
        <ul class="report-woken" v-if="report.names.length > 0">
          <li v-for="name in report.names" :key="name">{{ name }}</li>
        </ul>
        <ul class="report-skipped" v-if="report.skipped.length > 0">
          <li v-for="line in report.skipped" :key="line">{{ line }}</li>
        </ul>
      </div>

      <template v-else>
        <p class="wake-intro">
          A sleeping room fights like a classic beast room until your family has a quest for its beast. Waking one
          makes the quest, starting this Monday, and gives it to the heroes you pick.
        </p>

        <div class="wake-head" v-if="sleeping.length > 0">
          <span>Sleeping quests</span>
          <span class="wake-all">
            <button type="button" @click="emit('tickAll', true)">All</button>
            <button type="button" @click="emit('tickAll', false)">None</button>
          </span>
        </div>
        <ul class="wake-list" v-if="sleeping.length > 0">
          <li v-for="choice in sleeping" :key="choice.beastId">
            <button type="button" class="wake-row" :class="`tier-${choice.tier}`" role="checkbox"
              :aria-checked="ticked.includes(choice.beastId)" @click="emit('toggleTick', choice.beastId)">
              <span class="portrait">
                <img v-if="portraitOf(choice.avatar)" :src="portraitOf(choice.avatar)!" alt="" />
                <i v-else class="fad fa-paw-claws" aria-hidden="true"></i>
              </span>
              <span class="body">
                <span class="title">{{ choice.questName }}</span>
                <span class="facts">
                  <span class="chip chip-tier">{{ TIER_NAMES[choice.tier] }}</span>
                  <span class="facts-text">{{ choice.beastName }} · {{ choice.difficulty }}</span>
                </span>
                <span class="when">{{ choice.schedule }}{{ choice.rooms > 1 ? ` · ${choice.rooms} rooms` : "" }}</span>
              </span>
              <i class="fad pick" :class="ticked.includes(choice.beastId) ? 'fa-check-circle' : 'fa-circle'"
                aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <p class="wake-none" v-else>Every quest room already has a quest.</p>

        <template v-if="covered.length > 0">
          <div class="wake-head"><span>Already awake</span></div>
          <ul class="wake-list">
            <li v-for="choice in covered" :key="choice.beastId">
              <div class="wake-row is-static" :class="`tier-${choice.tier}`">
                <span class="portrait">
                  <img v-if="portraitOf(choice.avatar)" :src="portraitOf(choice.avatar)!" alt="" />
                  <i v-else class="fad fa-paw-claws" aria-hidden="true"></i>
                </span>
                <span class="body">
                  <span class="title">{{ choice.beastName }}</span>
                  <span class="when">uses your quest "{{ choice.quest?.achievementName }}"</span>
                </span>
              </div>
            </li>
          </ul>
        </template>
      </template>
    </ion-content>

    <!-- Heroes and the Wake button: the bottom of the sheet, under the thumb -->
    <ion-footer class="wake-dock">
      <div class="dock" v-if="!report">
        <p class="dock-label">Wake them for</p>
        <div class="hero-chips">
          <button type="button" v-for="hero in heroes" :key="hero.id" class="hero-chip"
            :class="{ 'is-on': pickedHeroes.includes(hero.id) }" role="checkbox"
            :aria-checked="pickedHeroes.includes(hero.id)" @click="emit('toggleHero', hero.id)">
            <i class="fad" :class="pickedHeroes.includes(hero.id) ? 'fa-check-circle' : 'fa-circle'"
              aria-hidden="true"></i>
            {{ hero.nick }}
          </button>
        </div>
        <p class="dock-problem" v-if="problem">{{ problem }}</p>
        <button type="button" class="wake-confirm" :disabled="problem !== null || waking" @click="emit('wake')">
          <i class="fad fa-sunrise" aria-hidden="true"></i>
          {{ waking ? "Waking..." : confirmText }}
        </button>
      </div>
      <div class="dock" v-else>
        <button type="button" class="wake-confirm" @click="emit('close')">Done</button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from "@ionic/vue";
import { TIER_NAMES } from "@/lib/services/quests/QuestLabels";
import type { WakeChoice } from "@/lib/services/temples/wakeTempleQuests";
import type { HeroOption, WakeReport } from "../../hooks/useTempleQuests";
import { portraitOf } from "./portraitUrl";

interface WakeSheetProps {
  isOpen: boolean;
  /** Templates nobody has a quest for yet: tickable */
  sleeping: WakeChoice[];
  /** Templates a family quest already fills */
  covered: WakeChoice[];
  heroes: HeroOption[];
  pickedHeroes: string[];
  /** The beast ids of the sleeping templates that are ticked */
  ticked: string[];
  report: WakeReport | null;
  /** Why nothing can be woken yet; null when it can */
  problem: string | null;
  waking: boolean;
  /** "Wake 4 quests for Max" */
  confirmText: string;
}

interface WakeSheetEmits {
  (e: "close"): void;
  (e: "toggleHero", id: string): void;
  (e: "toggleTick", beastId: string): void;
  (e: "tickAll", on: boolean): void;
  (e: "wake"): void;
}

/**
 * The Wake quests sheet: the temple's sleeping quest templates to tick, the beasts a family quest already fills
 * ("uses your quest"), and under the thumb the heroes to wake them for and the Wake button. After the wake it says what
 * was made and what was skipped. It holds no state of its own: useTempleQuests does, and this reports the taps.
 */
defineProps<WakeSheetProps>();

const emit = defineEmits<WakeSheetEmits>();
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./questCard" as *;

.wake-modal {
  --width: min(96vw, 720px);
  --height: 92vh;
  --border-radius: 12px;
}

.close-wake {
  --color: #{$eb-color-cream};
}

.wake-content {
  --background: #{$eb-color-dark-purple};
  color: $eb-color-cream;
  font-family: $eb-font-status;
}

.wake-intro {
  margin: 12px 16px;
  font-size: 0.95rem;
  line-height: 1.4;
  color: rgba(231, 230, 179, 0.85);
}

.wake-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 16px 6px;
  font-size: 0.9rem;
  color: $eb-color-pale-yellow;
}

.wake-all {
  display: flex;
  gap: 8px;

  button {
    min-width: 52px;
    min-height: 36px;
    padding: 4px 12px;
    font-family: inherit;
    font-size: 0.85rem;
    color: $eb-color-cream;
    background: transparent;
    border: 2px solid rgba(231, 230, 179, 0.35);
    border-radius: 6px;
  }
}

.wake-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0 16px 12px;
  list-style: none;
}

.wake-row {
  @include quest-card;

  &[aria-checked="true"] {
    border-color: $eb-color-pale-yellow;
    background: rgba(104, 208, 184, 0.16);
  }

  .pick {
    flex: 0 0 auto;
    font-size: 1.5rem;
    --fa-primary-color: #{$eb-color-cream};
    --fa-secondary-color: #{$eb-color-cream};
    --fa-secondary-opacity: 0.35;
    opacity: 0.6;
  }

  &[aria-checked="true"] .pick {
    --fa-primary-color: #{$eb-color-mint-green};
    --fa-secondary-color: #{$eb-color-mint-green};
    opacity: 1;
  }
}

.wake-none {
  margin: 12px 16px;
  font-size: 0.95rem;
  color: rgba(231, 230, 179, 0.75);
}

.wake-report {
  margin: 16px;
  padding: 14px;
  background: rgba(104, 208, 184, 0.12);
  border: 2px solid rgba(104, 208, 184, 0.4);
  border-radius: 8px;

  .report-line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.1rem;
    color: #fff;

    i {
      --fa-primary-color: #{$eb-color-pale-yellow};
      --fa-secondary-color: #{$eb-color-minty-blue};
    }
  }

  .report-woken,
  .report-skipped {
    margin: 10px 0 0;
    padding-left: 22px;
    list-style: disc;
    font-size: 0.95rem;
    line-height: 1.4;
    color: $eb-color-cream;
  }

  .report-skipped {
    color: $eb-color-sky-blue;
  }
}

.wake-dock {
  --background: transparent;

  &::before {
    display: none;
  }

  .dock {
    @include dock;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }
}

.wake-confirm {
  @include dock-button;
}

.dock-label {
  margin: 0 0 6px;
  font-size: 0.85rem;
  color: rgba(231, 230, 179, 0.75);
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 4px 14px;
  font-family: $eb-font-status;
  font-size: 1rem;
  color: $eb-color-cream;
  background: rgba(20, 6, 28, 0.55);
  border: 2px solid rgba(231, 230, 179, 0.3);
  border-radius: 20px;
  -webkit-tap-highlight-color: transparent;

  i {
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
    --fa-secondary-opacity: 0.35;
  }

  &.is-on {
    color: $eb-color-dark-purple;
    background: $eb-color-minty-blue;
    border-color: $eb-color-pale-yellow;
  }
}

.dock-problem {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: #ffb4b4;
}
</style>
