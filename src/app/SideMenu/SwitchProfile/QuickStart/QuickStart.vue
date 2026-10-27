<template>
  <ion-header>
    <ion-toolbar class="quick-start-toolbar">
      <ion-title>Quick Start</ion-title>
      <ion-buttons slot="end">
        <ion-button aria-label="Close" @click="close">
          <i class="fad fa-times" aria-hidden="true"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="quick-start">
    <div class="qs-window">
      <div class="qs-window-header">
        <span class="qs-window-title">Play Tonight</span>
        <span class="qs-window-sub">No setup</span>
      </div>

      <p class="qs-blurb">
        Name your kids and tap Start. Each one gets three evening quests and a shop with treats they can earn
        tonight. You can make it your own later.
      </p>
      <p v-if="spireNote" class="qs-blurb" data-cy="quick-start-spire-note">{{ spireNote }}</p>

      <section class="qs-section qs-gm">
        <h3 class="qs-heading"><i class="fad fa-crown" aria-hidden="true"></i> You, the Game Master</h3>
        <p class="qs-note">
          The Game Master runs the game: you approve finished quests, stock the shop and change the rules. Your
          4-digit PIN keeps the kids out of those controls.
        </p>
        <div class="qs-name-row">
          <span class="qs-cursor" aria-hidden="true">&#9654;</span>
          <ion-input
            v-model="gmName"
            class="qs-name-input"
            aria-label="Your name"
            placeholder="Your name"
            :maxlength="QUICK_START_NAME_LENGTH"
            autocapitalize="words"
            data-cy="quick-start-gm-name"
          />
          <ion-input
            v-model="gmPin"
            class="qs-name-input qs-pin-input"
            aria-label="Your 4-digit PIN"
            placeholder="PIN"
            type="password"
            inputmode="numeric"
            :maxlength="4"
            data-cy="quick-start-gm-pin"
          />
        </div>
        <p v-if="isGmStarted && gmError" class="qs-error" role="alert">{{ gmError }}</p>
      </section>

      <section class="qs-section">
        <h3 class="qs-heading"><i class="fad fa-users" aria-hidden="true"></i> Your heroes</h3>
        <div v-for="(_, index) in names" :key="index" class="qs-name-row">
          <span class="qs-cursor" aria-hidden="true">&#9654;</span>
          <ion-input
            v-model="names[index]"
            class="qs-name-input"
            :aria-label="`Hero ${index + 1} name`"
            :placeholder="index === 0 ? 'First kid\'s name' : 'Another kid (optional)'"
            :maxlength="QUICK_START_NAME_LENGTH"
            autocapitalize="words"
            enterkeyhint="next"
            data-cy="quick-start-name"
          />
          <ion-button
            v-if="names.length > 1"
            fill="clear"
            size="small"
            class="qs-remove"
            :aria-label="`Remove hero ${index + 1}`"
            @click="removeRow(index)"
          >
            <i class="fad fa-times-circle" aria-hidden="true"></i>
          </ion-button>
        </div>
        <button v-if="names.length < QUICK_START_MAX_HEROES" type="button" class="qs-add" @click="addRow">
          <i class="fad fa-plus" aria-hidden="true"></i> Add another hero
        </button>
      </section>

      <section class="qs-section">
        <h3 class="qs-heading"><i class="fad fa-dragon" aria-hidden="true"></i> Tonight's quests</h3>
        <ul class="qs-list">
          <li v-for="quest in quests" :key="quest.id">
            <span class="qs-item-name">{{ quest.name }}</span>
            <span class="qs-item-what">{{ quest.chore }}</span>
            <span class="qs-item-pay"><i class="fad fa-coins" aria-hidden="true"></i> {{ quest.gp }} GP</span>
          </li>
        </ul>
      </section>

      <section class="qs-section">
        <h3 class="qs-heading"><i class="fad fa-store" aria-hidden="true"></i> Rewards in the Market</h3>
        <ul class="qs-list">
          <li v-for="item in rewards" :key="item.id">
            <span class="qs-item-name"><i :class="`fad fa-${item.icon}`" aria-hidden="true"></i> {{ item.name }}</span>
            <span class="qs-item-pay"><i class="fad fa-coins" aria-hidden="true"></i> {{ item.price }} GP</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="qs-actions">
      <ion-button
        expand="block"
        class="qs-start"
        :disabled="!canStart || isStarting"
        data-cy="quick-start-go"
        @click="start"
      >
        <i class="fad fa-play" aria-hidden="true"></i>&nbsp;{{ isStarting ? "Setting up..." : startLabel }}
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { useToast } from "@/hooks/useToast";
import { useVoice } from "@/hooks/useVoice";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { QUICK_START_PACK } from "@/lib/services/core/packs/catalog/quickStart";
import {
  QUICK_START_MAX_HEROES,
  QUICK_START_NAME_LENGTH,
  QuickStartError,
  gameMasterProblem,
  heroNames,
  runQuickStart,
} from "@/lib/services/core/packs/quickStart";
import { quickStartSpireCount, quickStartSpireNote } from "@/lib/services/temples/quickStartSpireNote";
import { runQuickStartTemple } from "@/lib/services/temples/quickStartTemple";
import debug from "@/lib/utils/debug";

const names = ref<string[]>(["", ""]);
const { voice } = useVoice();
const gmName = ref("");
const gmPin = ref("");
const isStarting = ref(false);
const { showToast } = useToast();

const quests = (QUICK_START_PACK.content.quests ?? []).map((quest) => ({
  id: quest.id,
  name: quest.achievementName,
  chore: BEAST_LIBRARY.find((beast) => beast.id === quest.beastId)?.chore ?? "",
  gp: quest.gp,
}));

const rewards = (QUICK_START_PACK.content.rewards ?? []).map((item) => ({
  id: item.id,
  name: item.name,
  icon: item.icon || "gift",
  price: item.basePrice,
}));

// Only the free fight rooms near the Spire's door take a quest, so the note says how many of tonight's do (not all three)
const spireCount = quickStartSpireCount();
const spireNote = computed(() => quickStartSpireNote(voice.value, spireCount, quests.length));

const gameMaster = computed(() => ({ name: String(gmName.value ?? ""), passcode: String(gmPin.value ?? "") }));
// The hint waits until the parent starts typing, so the form doesn't open on an error
const isGmStarted = computed(() => Boolean(gameMaster.value.name.trim() || gameMaster.value.passcode));
const gmError = computed(() => gameMasterProblem(gameMaster.value));

const heroCount = computed(() => heroNames(names.value).length);
const canStart = computed(() => heroCount.value > 0 && !gmError.value);
const startLabel = computed(() => (heroCount.value > 1 ? `Start with ${heroCount.value} heroes` : "Start tonight's game"));

onMounted(() => play$fx("openMenu"));

function addRow() {
  play$fx("cursor");
  names.value.push("");
}

function removeRow(index: number) {
  play$fx("cursor");
  names.value.splice(index, 1);
}

async function close() {
  play$fx("no");
  await modalController.dismiss(undefined, "cancel");
}

// Tonight's quests go into the Howling Spire and its other monster rooms wake for the heroes. The game is seeded by
// then, so a temple that will not open is only logged: the heroes can still play tonight from their quest board.
async function openHowlingSpire(heroIds: string[]) {
  try {
    await runQuickStartTemple(heroIds);
  } catch (error) {
    debug.warn("Quick start could not open the Howling Spire", error);
  }
}

async function start() {
  const isBlocked = !canStart.value || isStarting.value;
  if (isBlocked) return;
  isStarting.value = true;
  play$fx("select");
  try {
    const { heroes, gameMaster: parent } = await runQuickStart(names.value, gameMaster.value);
    await openHowlingSpire(heroes.map((hero) => String(hero.id)));
    await modalController.dismiss({ heroes, gameMaster: parent }, "started");
  } catch (error) {
    debug.error("Quick start failed", error);
    play$fx("no");
    const message = error instanceof QuickStartError ? error.message : "Quick start could not set up the game. Try again.";
    await showToast(message, 4000);
  } finally {
    isStarting.value = false;
  }
}
</script>

<style scoped lang="scss" src="./_QuickStart.scss" />
