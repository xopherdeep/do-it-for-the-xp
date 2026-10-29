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
        <p class="theme-note">
          Saved on this device as the family default. Widgets already sitting on your home screen keep the
          palette they were placed with until each one gets a picker of its own.
        </p>
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
          <ion-segment-button value="board">
            <ion-label>Quest Board</ion-label>
          </ion-segment-button>
          <ion-segment-button value="dock">
            <ion-label>Action Dock</ion-label>
          </ion-segment-button>
          <ion-segment-button value="nextQuest">
            <ion-label>Next Quest</ion-label>
          </ion-segment-button>
          <ion-segment-button value="level">
            <ion-label>Level Gauge</ion-label>
          </ion-segment-button>
          <ion-segment-button value="party">
            <ion-label>Party Vitals</ion-label>
          </ion-segment-button>
          <ion-segment-button value="companion">
            <ion-label>Companion</ion-label>
          </ion-segment-button>
          <ion-segment-button value="bounty">
            <ion-label>Bounty Desk</ion-label>
          </ion-segment-button>
          <ion-segment-button value="spellbook">
            <ion-label>Spellbook</ion-label>
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
            <span class="multiplier-badge">{{ nextChestLabel }}</span>
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

          <!-- Quest Board Mockup -->
          <div v-else-if="isBoardSelected" class="mockup-board">
            <div class="board-header">
              <span class="board-title">QUEST BOARD</span>
              <span class="board-count">3 open</span>
            </div>
            <div v-for="row in boardSample" :key="row.title" class="board-row">
              <span class="board-quest">{{ row.title }}</span>
              <span class="board-due" :class="{ late: row.late }">{{ row.dueLabel }}</span>
              <span class="board-xp">+{{ row.xp }} XP</span>
            </div>
          </div>

          <!-- Dock Mockup -->
          <div v-else-if="isDockSelected" class="mockup-dock">
            <div class="dock-btn accent">+ TASK</div>
            <div class="dock-btn">CHORES</div>
            <div class="dock-btn green">DUNGEON</div>
            <div class="dock-btn gold">PARTY</div>
          </div>

          <!-- Next Quest Mockup -->
          <div v-else-if="isNextQuestSelected" class="mockup-next-quest">
            <div class="next-quest-header">
              <span class="next-quest-label">NEXT QUEST</span>
              <span class="next-quest-badge">Today</span>
            </div>
            <div class="next-quest-body">
              <span class="next-quest-title">Clear Dungeon Floor</span>
            </div>
            <div class="next-quest-footer">
              <span class="next-quest-reward">+50 XP • 10 GP</span>
              <span class="next-quest-btn">VIEW</span>
            </div>
          </div>

          <!-- Level Gauge Mockup -->
          <div v-else-if="isLevelSelected" class="mockup-level">
            <div class="mockup-header">
              <span class="mockup-name">{{ heroName }}</span>
              <span class="mockup-badge">LV {{ heroLevel }}</span>
            </div>
            <div class="level-progress-row">
              <span class="level-label">EXPERIENCE</span>
              <span class="level-pct">{{ xpPercent }}%</span>
            </div>
            <div class="mockup-bar">
              <div class="bar-fill xp-fill" :style="{ width: `${xpPercent}%` }"></div>
            </div>
            <span class="level-subtext">{{ heroXp }} / {{ heroNextLevelXp }} XP</span>
            <span class="level-remaining">{{ heroRemainingXp }} XP to next level</span>
          </div>

          <!-- Party Vitals Mockup -->
          <div v-else-if="isPartySelected" class="mockup-party">
            <div class="party-header">
              <span class="party-title">PARTY VITALS</span>
              <span class="party-badge">PARTY</span>
            </div>
            <div class="party-row">
              <span class="party-name">{{ heroName }}</span>
              <span class="party-lvl">LV {{ heroLevel }}</span>
              <div class="party-bar hp"><div class="bar-fill hp-fill" :style="{ width: `${hpPercent}%` }"></div></div>
              <div class="party-bar mp"><div class="bar-fill mp-fill" :style="{ width: `${mpPercent}%` }"></div></div>
            </div>
            <div class="party-row">
              <span class="party-name">Mage</span>
              <span class="party-lvl">LV 2</span>
              <div class="party-bar hp"><div class="bar-fill hp-fill" style="width: 80%"></div></div>
              <div class="party-bar mp"><div class="bar-fill mp-fill" style="width: 60%"></div></div>
            </div>
          </div>

          <!-- Companion Mockup -->
          <div v-else-if="isCompanionSelected" class="mockup-companion">
            <div class="mockup-header">
              <span class="mockup-name">{{ heroName }}</span>
              <span class="mockup-badge">LV {{ heroLevel }}</span>
            </div>
            <span class="mockup-class">{{ heroClass }}</span>
            <div class="companion-bubble">
              "Ready for adventure! Check the quest board!"
            </div>
            <div class="companion-footer">
              <span class="companion-streak">{{ currentStreak }}-Day Streak</span>
              <span class="companion-hint">Tap to visit</span>
            </div>
          </div>

          <!-- Bounty Desk Mockup -->
          <div v-else-if="isBountySelected" class="mockup-bounty">
            <div class="bounty-header">
              <span class="bounty-title">BOUNTY DESK</span>
              <span class="bounty-badge">GM</span>
            </div>
            <div class="bounty-stats">
              <div class="bounty-col">
                <span class="bounty-label">APPROVALS</span>
                <span class="bounty-val gold">0</span>
              </div>
              <div class="bounty-col">
                <span class="bounty-label">OVERDUE</span>
                <span class="bounty-val red">0</span>
              </div>
            </div>
            <span class="bounty-hint">Tap to review approvals</span>
          </div>

          <!-- Spellbook Mockup -->
          <div v-else-if="isSpellbookSelected" class="mockup-spellbook">
            <div class="spell-ap-box">
              <span class="spell-ap-label">ACTION</span>
              <span class="spell-ap-val">{{ heroAp }} AP</span>
            </div>
            <div class="spell-btn green">HEAL</div>
            <div class="spell-btn accent">BOOST</div>
            <div class="spell-btn blue">SPELLS</div>
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
  modalController,
  toastController
} from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { useHeroStreak } from "@/hooks/useHeroStreak";
import { statsOf } from "@/lib/services/multiplayer/heroSheet";
import { WIDGET_THEMES, type WidgetThemeId } from "@/lib/services/widgets/widgetCatalog";
import { useUserStore } from "@/lib/store/stores/user";
import { syncAllWidgets } from "@/lib/services/widgets/widgetSyncTrigger";
import { reloadAllWidgets } from "@/lib/services/widgets/widgetSync";
import { nextChest } from "@/lib/services/streaks/streakChests";
import debug from "@/lib/utils/debug";

/**
 * The palette the family picked, remembered on this device (widgets sit on this device's home
 * screen). It is a default and not a repaint: restyling a placed widget needs its appWidgetId,
 * which only a configure activity can hand over, and there is none yet.
 */
const THEME_STORAGE_KEY = "xp-widget-theme";

const storedTheme = (): WidgetThemeId => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && saved in WIDGET_THEMES ? (saved as WidgetThemeId) : "earthbound";
  } catch (error) {
    debug.warn("widgets: could not read the saved theme", error);
    return "earthbound";
  }
};

const emit = defineEmits(["dismiss"]);

const userStore = useUserStore();
const activeTheme = ref<WidgetThemeId>(storedTheme());
const selectedWidgetType = ref("hero");
const isSyncing = ref(false);

const availableThemes = computed(() => Object.values(WIDGET_THEMES));

const isHeroSelected = computed(() => selectedWidgetType.value === "hero");
const isStreakSelected = computed(() => selectedWidgetType.value === "streak");
const isVaultSelected = computed(() => selectedWidgetType.value === "vault");
const isBoardSelected = computed(() => selectedWidgetType.value === "board");
const isDockSelected = computed(() => selectedWidgetType.value === "dock");
const isNextQuestSelected = computed(() => selectedWidgetType.value === "nextQuest");
const isLevelSelected = computed(() => selectedWidgetType.value === "level");
const isPartySelected = computed(() => selectedWidgetType.value === "party");
const isCompanionSelected = computed(() => selectedWidgetType.value === "companion");
const isBountySelected = computed(() => selectedWidgetType.value === "bounty");
const isSpellbookSelected = computed(() => selectedWidgetType.value === "spellbook");

const activeWidgetTitle = computed(() => {
  if (isHeroSelected.value) return "Hero Status Card (2x2)";
  if (isStreakSelected.value) return "Streak Flame Altar (1x1)";
  if (isVaultSelected.value) return "Gold Vault Kiosk (2x1)";
  if (isBoardSelected.value) return "Quest Board (4x2)";
  if (isDockSelected.value) return "Quick Action Dock (4x1)";
  if (isNextQuestSelected.value) return "Next Quest Radar (2x1)";
  if (isLevelSelected.value) return "Level & XP Gauge (2x1)";
  if (isPartySelected.value) return "Party Vitals Roster (4x2)";
  if (isCompanionSelected.value) return "Hero Companion Altar (2x2)";
  if (isBountySelected.value) return "Bounty Approvals Desk (2x1)";
  if (isSpellbookSelected.value) return "Spellbook Action Dock (4x1)";
  return "Widget Preview";
});

const hero = computed(() => userStore.currentUser || {});
// The profile is nested (stats.hp.now, stats.gp.wallet); statsOf is the one reader that knows it
const heroStats = computed(() => statsOf(hero.value));
const heroId = computed(() => String(hero.value.id ?? ""));
const { streak } = useHeroStreak(heroId);

const heroName = computed(() => hero.value.name?.nick || hero.value.name?.first || "Hero");
const heroLevel = computed(() => heroStats.value.level);
const heroClass = computed(() => String(hero.value.jobClass || "Novice"));
const heroHp = computed(() => heroStats.value.hp);
const heroMaxHp = computed(() => Math.max(1, heroStats.value.maxHp));
const heroMp = computed(() => heroStats.value.mp);
const heroMaxMp = computed(() => Math.max(1, heroStats.value.maxMp));
const heroGp = computed(() => heroStats.value.gp);
const currentStreak = computed(() => streak.value.current);
const nextChestLabel = computed(() => {
  const days = nextChest(currentStreak.value).day - currentStreak.value;
  return days === 1 ? "Chest tomorrow" : `Chest in ${Math.max(0, days)}`;
});
const savingsGp = computed(() => Math.max(0, Math.round(Number(hero.value.stats?.gp?.savings) || 0)));

const hpPercent = computed(() => Math.min(100, Math.max(0, (heroHp.value / heroMaxHp.value) * 100)));
const mpPercent = computed(() => Math.min(100, Math.max(0, (heroMp.value / heroMaxMp.value) * 100)));
const heroXp = computed(() => Math.max(0, heroStats.value.xp));
const heroNextLevelXp = computed(() => Math.max(1, heroStats.value.nextLevelXp));
const xpPercent = computed(() => Math.min(100, Math.max(0, Math.round((heroXp.value / heroNextLevelXp.value) * 100))));
const heroRemainingXp = computed(() => Math.max(0, heroNextLevelXp.value - heroXp.value));
const heroAp = computed(() => Math.max(0, heroStats.value.ap));

/** The board widget draws the hero's own rows; this modal loads none, so the preview shows the shape */
const boardSample = [
  { title: "Make the bed", dueLabel: "8:00am", late: true, xp: 100 },
  { title: "Dishes", dueLabel: "6:00pm", late: false, xp: 100 },
  { title: "Water plants", dueLabel: "Anytime", late: false, xp: 50 }
];

const handleThemeChange = (event: CustomEvent) => {
  const selected = event.detail.value as WidgetThemeId;
  if (!selected) return;
  activeTheme.value = selected;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, selected);
  } catch (error) {
    debug.warn("widgets: could not remember the theme", error);
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

const sayHowItWent = async (message: string): Promise<void> => {
  const toast = await toastController.create({
    message,
    position: "middle",
    cssClass: "rpg-toast",
    buttons: [{ text: "OK", role: "cancel" }]
  });
  await toast.present();
};

// The button used to claim success whatever happened, so a widget full of stale numbers looked synced
const handleSyncNow = async () => {
  play$fx("select");
  isSyncing.value = true;
  try {
    const result = await syncAllWidgets();
    if (!result.ok) {
      // The reason names a bridge or a store ("not android"): it belongs in the log, not in front of a kid
      debug.warn("widgets: the sync was refused", result.reason);
      play$fx("no");
      await sayHowItWent("The home screen would not take the update.");
      return;
    }
    await reloadAllWidgets();
    await sayHowItWent("Your home screen widgets are up to date.");
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

.theme-note {
  margin: 0.75rem 0 0;
  font-size: 0.7rem;
  line-height: 1.5;
  color: rgb(148, 163, 184);
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

.mockup-board {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}

.board-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: rgb(255, 215, 0);
}

.board-count {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
}

.board-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  border-top: 1px solid rgb(45, 55, 72);
  padding-top: 4px;
}

.board-quest {
  flex: 1;
  color: rgb(255, 255, 255);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-due {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);

  &.late { color: rgb(255, 109, 0); }
}

.board-xp {
  font-size: 0.65rem;
  font-weight: bold;
  color: rgb(16, 185, 129);
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

.mockup-next-quest {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.next-quest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.next-quest-label {
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(255, 216, 74);
}

.next-quest-badge {
  background: rgb(45, 55, 72);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  color: rgb(203, 213, 225);
}

.next-quest-title {
  font-size: 0.95rem;
  font-weight: bold;
  color: rgb(255, 255, 255);
}

.next-quest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.next-quest-reward {
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(255, 215, 0);
}

.next-quest-btn {
  background: rgb(45, 55, 72);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  color: rgb(16, 185, 129);
}

.mockup-level {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.level-progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.level-label {
  color: rgb(168, 85, 247);
}

.level-pct {
  color: rgb(255, 255, 255);
}

.xp-fill {
  background: rgb(168, 85, 247);
}

.level-subtext {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
}

.level-remaining {
  font-size: 0.7rem;
  font-weight: bold;
  color: rgb(255, 215, 0);
  margin-top: 2px;
}

.mockup-party {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.party-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.party-title {
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(255, 216, 74);
}

.party-badge {
  background: rgb(45, 55, 72);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  color: rgb(203, 213, 225);
}

.party-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.party-name {
  flex: 1;
  font-weight: bold;
  color: rgb(255, 255, 255);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-lvl {
  font-size: 0.65rem;
  color: rgb(255, 216, 74);
}

.party-bar {
  width: 40px;
  height: 6px;
  background: rgb(51, 65, 85);
  border-radius: 2px;
  overflow: hidden;

  &.mp {
    width: 30px;
  }
}

.mockup-companion {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.companion-bubble {
  background: rgb(45, 55, 72);
  padding: 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: rgb(203, 213, 225);
  text-align: center;
  margin: 4px 0;
}

.companion-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.companion-streak {
  font-size: 0.7rem;
  font-weight: bold;
  color: rgb(255, 109, 0);
}

.companion-hint {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
}

.mockup-bounty {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bounty-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bounty-title {
  font-size: 0.75rem;
  font-weight: bold;
  color: rgb(255, 216, 74);
}

.bounty-badge {
  background: rgb(45, 55, 72);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  color: rgb(255, 215, 0);
}

.bounty-stats {
  display: flex;
  justify-content: space-around;
  margin: 4px 0;
}

.bounty-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bounty-label {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
}

.bounty-val {
  font-size: 1.1rem;
  font-weight: bold;

  &.gold { color: rgb(255, 216, 74); }
  &.red { color: rgb(239, 68, 68); }
}

.bounty-hint {
  font-size: 0.65rem;
  color: rgb(148, 163, 184);
  text-align: center;
}

.mockup-spellbook {
  display: flex;
  gap: 6px;
  align-items: center;
}

.spell-ap-box {
  background: rgb(45, 55, 72);
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spell-ap-label {
  font-size: 0.55rem;
  color: rgb(148, 163, 184);
}

.spell-ap-val {
  font-size: 0.8rem;
  font-weight: bold;
  color: rgb(245, 158, 11);
}

.spell-btn {
  flex: 1;
  background: rgb(45, 55, 72);
  padding: 10px 4px;
  border-radius: 4px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: bold;
  border: 1px solid rgb(74, 85, 104);

  &.accent { color: rgb(255, 216, 74); }
  &.green { color: rgb(16, 185, 129); }
  &.blue { color: rgb(59, 130, 246); }
}
</style>
