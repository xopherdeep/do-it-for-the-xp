<template>
  <ion-header>
    <ion-toolbar color="dark">
      <ion-title>Home Screen Widgets</ion-title>
      <ion-buttons slot="end">
        <ion-button data-cy="close-widget-config" @click="handleDismiss">
          <i class="fad fa-times"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding xp-widget-config-content">
    <!-- Instructions Card -->
    <ion-card class="guide-card">
      <ion-card-header>
        <ion-card-subtitle class="text-yellow-400">ANDROID LAUNCHER</ion-card-subtitle>
        <ion-card-title>How to Add Widgets</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ol class="guide-steps">
          <li>Touch and hold an empty space on your Android home screen.</li>
          <li>Tap <strong>Widgets</strong> in the pop-up menu.</li>
          <li>Scroll to <strong>Do it for the XP</strong>.</li>
          <li>Drag your chosen widget to the desired screen location.</li>
        </ol>
      </ion-card-content>
    </ion-card>

    <!-- Theme Chooser -->
    <ion-card class="theme-card">
      <ion-card-header>
        <ion-card-subtitle class="text-yellow-400">RETRO RPG PALETTE</ion-card-subtitle>
        <ion-card-title>Select Widget Theme</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-segment
          :value="activeTheme"
          scrollable
          @ionChange="handleThemeChange"
        >
          <ion-segment-button
            v-for="theme in availableThemes"
            :key="theme.id"
            :value="theme.id"
          >
            <ion-label>{{ theme.name }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-card-content>
    </ion-card>

    <!-- Live Preview Carousel/Selector -->
    <ion-card class="preview-card">
      <ion-card-header>
        <ion-card-subtitle class="text-yellow-400">INTERACTIVE PREVIEW</ion-card-subtitle>
        <ion-card-title>{{ activeWidgetTitle }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-segment
          :value="selectedWidgetType"
          scrollable
          @ionChange="handleWidgetSelect"
        >
          <ion-segment-button value="hero">
            <ion-label>Hero Card</ion-label>
          </ion-segment-button>
          <ion-segment-button value="streak">
            <ion-label>Streak Flame</ion-label>
          </ion-segment-button>
          <ion-segment-button value="vault">
            <ion-label>Gold Vault</ion-label>
          </ion-segment-button>
          <ion-segment-button value="dock">
            <ion-label>Action Dock</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Preview Box -->
        <div
          class="widget-mockup"
          :class="`theme--${activeTheme}`"
        >
          <!-- Hero Mockup -->
          <div v-if="isHeroSelected" class="mockup-hero">
            <div class="mockup-header">
              <span class="mockup-name">{{ heroName }}</span>
              <span class="mockup-badge">LV {{ heroLevel }}</span>
            </div>
            <span class="mockup-class">{{ heroClass }}</span>
            <div class="mockup-bar-row">
              <span class="bar-label hp-label">HP</span>
              <div class="mockup-bar">
                <div class="bar-fill hp-fill" :style="{ width: `${hpPercent}%` }"></div>
              </div>
              <span class="bar-val">{{ heroHp }}/{{ heroMaxHp }}</span>
            </div>
            <div class="mockup-bar-row">
              <span class="bar-label mp-label">MP</span>
              <div class="mockup-bar">
                <div class="bar-fill mp-fill" :style="{ width: `${mpPercent}%` }"></div>
              </div>
              <span class="bar-val">{{ heroMp }}/{{ heroMaxMp }}</span>
            </div>
            <div class="mockup-footer">
              <span class="gp-text">{{ heroGp }} GP</span>
              <span class="streak-text">{{ currentStreak }} Day Streak</span>
            </div>
          </div>

          <!-- Streak Mockup -->
          <div v-else-if="isStreakSelected" class="mockup-streak">
            <span class="streak-num">{{ currentStreak }}</span>
            <span class="streak-caption">DAY STREAK</span>
            <span class="multiplier-badge">{{ streakMultiplier }}x XP</span>
          </div>

          <!-- Vault Mockup -->
          <div v-else-if="isVaultSelected" class="mockup-vault">
            <span class="vault-title">HOMETOWN BANK</span>
            <div class="vault-row">
              <div class="vault-col">
                <span class="vault-caption">WALLET</span>
                <span class="vault-val gold">{{ heroGp }} GP</span>
              </div>
              <div class="vault-col">
                <span class="vault-caption">SAVINGS</span>
                <span class="vault-val green">{{ savingsGp }} GP</span>
              </div>
            </div>
            <span class="vault-hint">Tap to visit ATM</span>
          </div>

          <!-- Dock Mockup -->
          <div v-else-if="isDockSelected" class="mockup-dock">
            <div class="dock-btn accent">+ TASK</div>
            <div class="dock-btn">CHORES</div>
            <div class="dock-btn green">DUNGEON</div>
            <div class="dock-btn gold">PARTY</div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Sync Action Button -->
    <div class="sync-action-container ion-padding">
      <ion-button
        expand="block"
        color="warning"
        :disabled="isSyncing"
        @click="handleSyncNow"
      >
        <ion-spinner v-if="isSyncing" slot="start" name="crescent" />
        <i v-else class="fad fa-sync mr-2"></i>
        Sync Widgets Now
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  modalController
} from "@ionic/vue";
import { WIDGET_THEMES, type WidgetThemeId } from "@/lib/services/widgets/widgetCatalog";
import { useUserStore } from "@/lib/store/stores/user";
import { syncAllWidgets } from "@/lib/services/widgets/widgetSyncTrigger";
import { reloadAllWidgets } from "@/lib/services/widgets/widgetSync";
import { streakMultiplierFor } from "@/lib/services/widgets/widgetDataExtractor";

const emit = defineEmits(["dismiss"]);

const userStore = useUserStore();
const activeTheme = ref<WidgetThemeId>("earthbound");
const selectedWidgetType = ref("hero");
const isSyncing = ref(false);

const availableThemes = computed(() => Object.values(WIDGET_THEMES));

const isHeroSelected = computed(() => selectedWidgetType.value === "hero");
const isStreakSelected = computed(() => selectedWidgetType.value === "streak");
const isVaultSelected = computed(() => selectedWidgetType.value === "vault");
const isDockSelected = computed(() => selectedWidgetType.value === "dock");

const activeWidgetTitle = computed(() => {
  if (isHeroSelected.value) return "Hero Status Card (2x2)";
  if (isStreakSelected.value) return "Streak Flame Altar (1x1)";
  if (isVaultSelected.value) return "Gold Vault Kiosk (2x1)";
  if (isDockSelected.value) return "Quick Action Dock (4x1)";
  return "Widget Preview";
});

const hero = computed(() => userStore.currentUser || {});
const heroStats = computed(() => hero.value.stats || {});

const heroName = computed(() => hero.value.nickname || hero.value.name?.nick || "Hero");
const heroLevel = computed(() => Number(heroStats.value.level ?? 1));
const heroClass = computed(() => String(hero.value.jobClass || "Novice"));
const heroHp = computed(() => Number(heroStats.value.hp ?? 20));
const heroMaxHp = computed(() => Math.max(1, Number(heroStats.value.maxHp ?? 20)));
const heroMp = computed(() => Number(heroStats.value.mp ?? 10));
const heroMaxMp = computed(() => Math.max(1, Number(heroStats.value.maxMp ?? 10)));
const heroGp = computed(() => Number(heroStats.value.gp ?? 0));
const currentStreak = computed(() => Number(heroStats.value.streak ?? 0));
const streakMultiplier = computed(() => streakMultiplierFor(currentStreak.value).toFixed(1));
const savingsGp = computed(() => Number(heroStats.value.savings ?? 0));

const hpPercent = computed(() => Math.min(100, Math.max(0, (heroHp.value / heroMaxHp.value) * 100)));
const mpPercent = computed(() => Math.min(100, Math.max(0, (heroMp.value / heroMaxMp.value) * 100)));

const handleThemeChange = (event: CustomEvent) => {
  const selected = event.detail.value as WidgetThemeId;
  if (selected) {
    activeTheme.value = selected;
  }
};

const handleWidgetSelect = (event: CustomEvent) => {
  const selected = event.detail.value;
  if (selected) {
    selectedWidgetType.value = selected;
  }
};

const handleDismiss = () => {
  modalController.dismiss();
  emit("dismiss");
};

const handleSyncNow = async () => {
  isSyncing.value = true;
  try {
    await syncAllWidgets([], currentStreak.value, savingsGp.value);
    await reloadAllWidgets();
  } finally {
    isSyncing.value = false;
  }
};
</script>

<style scoped lang="scss">
.xp-widget-config-content {
  --background: rgb(15, 18, 29);
  color: rgb(255, 255, 255);
}

.guide-steps {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.6;
  font-size: 0.9rem;
  color: rgb(203, 213, 225);
}

.widget-mockup {
  margin-top: 1rem;
  border-radius: 8px;
  padding: 12px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.2s ease;

  &.theme--earthbound {
    background: rgb(24, 35, 60);
    border: 3px solid rgb(74, 117, 160);
  }
  &.theme--gameboy {
    background: rgb(15, 56, 15);
    border: 3px solid rgb(48, 98, 48);
  }
  &.theme--lava {
    background: rgb(43, 13, 13);
    border: 3px solid rgb(183, 28, 28);
  }
  &.theme--dungeon {
    background: rgb(18, 18, 20);
    border: 3px solid rgb(66, 66, 66);
  }
  &.theme--gold {
    background: rgb(38, 28, 2);
    border: 3px solid rgb(255, 179, 0);
  }
}

.mockup-hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mockup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mockup-name {
  font-weight: bold;
  font-size: 1.1rem;
  color: rgb(255, 216, 74);
}

.mockup-badge {
  background: rgb(45, 55, 72);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.mockup-class {
  font-size: 0.75rem;
  color: rgb(148, 163, 184);
}

.mockup-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.bar-label {
  font-weight: bold;
  width: 20px;
  &.hp-label { color: rgb(16, 185, 129); }
  &.mp-label { color: rgb(59, 130, 246); }
}

.mockup-bar {
  flex: 1;
  height: 8px;
  background: rgb(51, 65, 85);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  &.hp-fill { background: rgb(16, 185, 129); }
  &.mp-fill { background: rgb(59, 130, 246); }
}

.bar-val {
  font-size: 0.75rem;
  color: rgb(203, 213, 225);
}

.mockup-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-weight: bold;
  font-size: 0.8rem;
}

.gp-text { color: rgb(255, 215, 0); }
.streak-text { color: rgb(255, 109, 0); }

.mockup-streak {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.streak-num {
  font-size: 2.2rem;
  font-weight: bold;
  color: rgb(255, 109, 0);
  line-height: 1;
}

.streak-caption {
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(203, 213, 225);
}

.multiplier-badge {
  margin-top: 4px;
  background: rgb(45, 55, 72);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: rgb(255, 215, 0);
  font-weight: bold;
}

.mockup-vault {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vault-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: rgb(255, 215, 0);
}

.vault-row {
  display: flex;
  justify-content: space-around;
}

.vault-col {
  display: flex;
  flex-direction: column;
}

.vault-caption {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
}

.vault-val {
  font-size: 1rem;
  font-weight: bold;
  &.gold { color: rgb(255, 215, 0); }
  &.green { color: rgb(16, 185, 129); }
}

.vault-hint {
  font-size: 0.65rem;
  color: rgb(100, 116, 139);
}

.mockup-dock {
  display: flex;
  gap: 6px;
}

.dock-btn {
  flex: 1;
  background: rgb(45, 55, 72);
  padding: 10px 4px;
  border-radius: 4px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(255, 255, 255);
  border: 1px solid rgb(74, 85, 104);

  &.accent { color: rgb(255, 216, 74); }
  &.green { color: rgb(16, 185, 129); }
  &.gold { color: rgb(255, 215, 0); }
}
</style>
