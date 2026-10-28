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
const streakMultiplier = computed(() => (currentStreak.value >= 7 ? "1.5" : currentStreak.value >= 3 ? "1.2" : "1.0"));
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
  --background: #0f121d;
  color: #ffffff;
}

.guide-steps {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.6;
  font-size: 0.9rem;
  color: #cbd5e1;
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
    background: #18233c;
    border: 3px solid #4a75a0;
  }
  &.theme--gameboy {
    background: #0f380f;
    border: 3px solid #306230;
  }
  &.theme--lava {
    background: #2b0d0d;
    border: 3px solid #b71c1c;
  }
  &.theme--dungeon {
    background: #121214;
    border: 3px solid #424242;
  }
  &.theme--gold {
    background: #261c02;
    border: 3px solid #ffb300;
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
  color: #ffd84a;
}

.mockup-badge {
  background: #2d3748;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.mockup-class {
  font-size: 0.75rem;
  color: #94a3b8;
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
  &.hp-label { color: #10b981; }
  &.mp-label { color: #3b82f6; }
}

.mockup-bar {
  flex: 1;
  height: 8px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  &.hp-fill { background: #10b981; }
  &.mp-fill { background: #3b82f6; }
}

.bar-val {
  font-size: 0.75rem;
  color: #cbd5e1;
}

.mockup-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-weight: bold;
  font-size: 0.8rem;
}

.gp-text { color: #ffd700; }
.streak-text { color: #ff6d00; }

.mockup-streak {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.streak-num {
  font-size: 2.2rem;
  font-weight: bold;
  color: #ff6d00;
  line-height: 1;
}

.streak-caption {
  font-size: 0.75rem;
  font-weight: bold;
  color: #cbd5e1;
}

.multiplier-badge {
  margin-top: 4px;
  background: #2d3748;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #ffd700;
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
  color: #ffd700;
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
  color: #94a3b8;
}

.vault-val {
  font-size: 1rem;
  font-weight: bold;
  &.gold { color: #ffd700; }
  &.green { color: #10b981; }
}

.vault-hint {
  font-size: 0.65rem;
  color: #64748b;
}

.mockup-dock {
  display: flex;
  gap: 6px;
}

.dock-btn {
  flex: 1;
  background: #2d3748;
  padding: 10px 4px;
  border-radius: 4px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: bold;
  color: #ffffff;
  border: 1px solid #4a5568;

  &.accent { color: #ffd84a; }
  &.green { color: #10b981; }
  &.gold { color: #ffd700; }
}
</style>
