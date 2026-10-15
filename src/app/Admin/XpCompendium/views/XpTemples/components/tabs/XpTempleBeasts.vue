<template>
  <ion-page class="xp-temple-beasts">
    <ion-content class="transparent-content">
      <div class="content-wrapper">
        <!-- What the temple is about, how big it is, and what the dots mean -->
        <TempleQuestsHeader v-if="hasRooms" :view="view" :theme-label="quests.themeLabel.value" />

        <div class="stat-pills" v-if="totalRooms > 0">
          <div class="stat-pill">
            <i class="fad fa-dragon"></i>
            <span>{{ totalRooms }} Threats</span>
          </div>
          <div class="stat-pill" v-if="roomCount('boss') > 0">
            <i class="fad fa-crown text-warning"></i>
            <span>{{ roomCount("boss") }} Boss{{ roomCount("boss") !== 1 ? "es" : "" }}</span>
          </div>
          <div class="stat-pill" v-if="roomCount('miniboss') > 0">
            <i class="fad fa-helmet-battle text-tertiary"></i>
            <span>{{ roomCount("miniboss") }} Miniboss{{ roomCount("miniboss") !== 1 ? "es" : "" }}</span>
          </div>
        </div>

        <!-- Rooms Grouped by Tier -->
        <ion-accordion-group v-if="totalRooms > 0" :value="activeTiers" :multiple="true" @ionChange="onAccordionChange">
          <template v-for="tier in TIERS" :key="tier.id">
            <ion-accordion v-if="roomCount(tier.id) > 0" :value="tier.id" class="tier-accordion"
              :class="`${tier.id}-tier`">
              <ion-item slot="header" class="tier-header">
                <div class="tier-icon" :class="tier.id">
                  <i class="fad" :class="tier.icon"></i>
                </div>
                <ion-label>
                  <h2>{{ tier.title }}</h2>
                  <p>
                    {{ roomCount(tier.id) }} encounter{{ roomCount(tier.id) !== 1 ? "s" : "" }}
                  </p>
                </ion-label>
              </ion-item>

              <div slot="content" class="tier-content">
                <!-- Quest rooms: the quest each holds, or the dormant template waiting to be woken -->
                <ul class="quest-list" v-if="view.groups[tier.id].length > 0">
                  <li v-for="row in view.groups[tier.id]" :key="row.key">
                    <TempleQuestRowCard :row="row" @open="navigateToRoom(row)" />
                  </li>
                </ul>

                <!-- Classic beast rooms: listed as they always were -->
                <p class="classic-label" v-if="view.groups[tier.id].length > 0 && classicEntries(tier.id).length > 0">
                  Classic beast rooms
                </p>
                <div class="beast-grid" v-if="classicEntries(tier.id).length > 0">
                  <ion-grid>
                    <ion-row>
                      <ion-col :size="tier.colSize" :size-md="tier.colMd" :size-lg="tier.colLg"
                        v-for="entry in classicEntries(tier.id)" :key="`${entry.roomSymbol}-${entry.beastId}`"
                        :id="`beast-card-${entry.roomSymbol}`">
                        <div class="beast-card-wrapper" role="button" tabindex="0" @click="openBeastSelector(entry)"
                          @keydown.enter.self="openBeastSelector(entry)"
                          @keydown.space.self.prevent="openBeastSelector(entry)">
                          <XpBeastSelectorItem v-if="entry.beast" :id="entry.beast.id" :name="entry.beast.name"
                            :avatar="entry.beast.avatar" :bg1="entry.beast.bg1" :bg2="entry.beast.bg2" />
                          <div v-else class="placeholder-beast" :class="tier.id">
                            <i class="fad" :class="tier.placeholderIcon"></i>
                            <span class="beast-name">{{ tier.placeholderLabel }}</span>
                          </div>
                          <div class="room-info-overlay" :class="{ small: tier.small }">
                            <div class="config-token-badge" :class="{ small: tier.small }">
                              {{ entry.roomSymbol }}
                            </div>
                            <XpCoordBadge :size="tier.small ? 'small' : 'medium'" :x="entry.col" :y="entry.row"
                              @click.stop="navigateToRoom(entry)" />
                          </div>
                        </div>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </div>
              </div>
            </ion-accordion>
          </template>
        </ion-accordion-group>

        <!-- Empty State -->
        <div class="glass-card empty-state" v-else>
          <ion-icon :icon="skullOutline" class="empty-icon"></ion-icon>
          <h2>No Quests Yet</h2>
          <p>
            Add quest rooms (or classic monster, miniboss or boss rooms) in the Layout tab to populate
            this dungeon with threats.
          </p>
        </div>
      </div>
    </ion-content>

    <!-- Wake quests sits at the bottom, under the thumb -->
    <ion-footer class="quests-dock" v-if="quests.choices.value.length > 0">
      <div class="dock">
        <button type="button" class="wake-open" :disabled="quests.sleeping.value.length === 0"
          @click="quests.openWake()">
          <i class="fad fa-sunrise" aria-hidden="true"></i>
          <span>{{ quests.sleeping.value.length === 0 ? "Every quest is awake" : "Wake quests" }}</span>
          <span class="wake-count" v-if="quests.sleeping.value.length > 0">{{ quests.sleeping.value.length }} asleep</span>
        </button>
      </div>
    </ion-footer>

    <TempleWakeSheet :is-open="quests.showWake.value" :sleeping="quests.sleeping.value" :covered="quests.covered.value"
      :heroes="quests.heroOptions.value" :picked-heroes="quests.pickedHeroes.value" :ticked="quests.ticked.value"
      :report="quests.report.value" :problem="quests.problem.value" :waking="quests.waking.value"
      :confirm-text="quests.confirmText.value" @close="quests.closeWake()" @toggle-hero="quests.toggleHero"
      @toggle-tick="quests.toggleTick" @tick-all="quests.setAllTicks" @wake="quests.confirmWake()" />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonFooter,
  useIonRouter,
  onIonViewDidEnter,
} from "@ionic/vue";
import { skullOutline } from "ionicons/icons";
import { TempleBeast } from "../../hooks/useTempleData";
import XpBeastSelectorItem from "@/app/Admin/XpCompendium/views/XpBestiary/components/XpBeastSelectorItem.vue";
import XpCoordBadge from "@/components/atoms/Coord/XpCoordBadge.vue";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";
import { inject, onMounted } from "vue";
import { useTimers } from "@/hooks/useTimers";
import { isSharedConfigToken, withPickedBeast } from "../XpTempleCreator/hooks/grid/roomSymbols";
import type { QuestTier } from "@/lib/services/temples/questRooms";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import { useTempleQuests } from "../../hooks/useTempleQuests";
import TempleQuestsHeader from "../quests/TempleQuestsHeader.vue";
import TempleQuestRowCard from "../quests/TempleQuestRowCard.vue";
import TempleWakeSheet from "../quests/TempleWakeSheet.vue";

const resolveRoomTypeFromTier = (tier: string): "monster" | "miniboss" | "boss" => {
  const isLesserTier = tier === "monster" || tier === "miniboss";
  return isLesserTier ? tier : "boss";
};

/** The three tiers, boss first: how each is titled, drawn, and how wide its classic cards are */
const TIERS: Array<{
  id: QuestTier;
  title: string;
  icon: string;
  placeholderIcon: string;
  placeholderLabel: string;
  colSize: string;
  colMd: string;
  colLg: string;
  small: boolean;
}> = [
  { id: "boss", title: "Bosses", icon: "fa-crown", placeholderIcon: "fa-crown fa-3x", placeholderLabel: "Boss Room", colSize: "6", colMd: "4", colLg: "3", small: false },
  { id: "miniboss", title: "Minibosses", icon: "fa-helmet-battle", placeholderIcon: "fa-helmet-battle fa-3x", placeholderLabel: "Miniboss", colSize: "6", colMd: "4", colLg: "3", small: false },
  { id: "monster", title: "Monsters", icon: "fa-skull", placeholderIcon: "fa-skull fa-2x", placeholderLabel: "Monster", colSize: "4", colMd: "3", colLg: "2", small: true },
];

export default defineComponent({
  name: "xp-temple-beasts",
  components: {
    IonPage,
    IonContent,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonFooter,
    XpBeastSelectorItem,
    XpCoordBadge,
    TempleQuestsHeader,
    TempleQuestRowCard,
    TempleWakeSheet,
  },
  setup() {
    const timers = useTimers();
    const route = useRoute();
    const ionRouter = useIonRouter();
    const templeId = route.params.templeId as string;

    // Inject shared temple data from XpTempleSettings
    const { templeBeastsWithDetails, temple, saveTemple, allBeasts } = inject(
      TempleDataInjectionKey
    )!;

    const selectionStore = useBestiarySelectionStore();
    const creatorStore = useTempleCreatorStore();

    // The quest rooms: rows, size, status dots, and Wake quests
    const layout = computed(() => temple.value.dungeonLayout as QuestLayout | undefined);
    const quests = useTempleQuests(templeId, layout, allBeasts);
    const view = computed(() => quests.view.value);

    // Quest rooms are listed as quests; only the classic beast rooms keep the old cards
    const questSymbols = computed(() => new Set(view.value.rows.map((row) => row.symbol)));

    const classicEntries = (tier: QuestTier): TempleBeast[] =>
      templeBeastsWithDetails.value.filter((b) => b.tier === tier && !questSymbols.value.has(b.roomSymbol));

    const roomCount = (tier: QuestTier): number => view.value.groups[tier].length + classicEntries(tier).length;

    const totalRooms = computed(() => TIERS.reduce((sum, tier) => sum + roomCount(tier.id), 0));
    const hasRooms = computed(() => totalRooms.value > 0);

    const activeTiers = ref<string[]>([]);

    const updateDefaultTiers = () => {
      activeTiers.value = TIERS.filter((tier) => roomCount(tier.id) > 0).map((tier) => tier.id);
    };

    // The rooms arrive after the tab does (the temple, then the quests): open every tier once they are in, unless the
    // Game Master has already opened or closed some
    const hasChosenTiers = ref(false);
    watch(totalRooms, (rooms) => {
      const isFirstFill = rooms > 0 && activeTiers.value.length === 0 && !hasChosenTiers.value;
      if (isFirstFill) updateDefaultTiers();
    });

    const onAccordionChange = (ev: CustomEvent) => {
      hasChosenTiers.value = true;
      activeTiers.value = Array.isArray(ev.detail.value)
        ? ev.detail.value
        : [ev.detail.value].filter(Boolean);
    };

    // The address names the room's floor, so the editor opens the cell on that floor
    const navigateToRoom = (entry: { floor: string; row: number; col: number }) => {
      ionRouter.push({
        name: "xp-temple-room-editor",
        params: {
          templeId,
          floor: entry.floor,
          row: entry.row.toString(),
          col: entry.col.toString(),
        },
      });
    };

    // Auto-scroll logic when returning to the tab
    const performScrollToTarget = (attempt = 0) => {
      const hash = window.location.hash;
      const targetId =
        creatorStore.pendingScrollId ||
        (hash.startsWith("#beast-card-") ? hash.substring(12) : null);

      if (!targetId) {
        const hasNoActiveTiers = activeTiers.value.length === 0;
        if (hasNoActiveTiers) updateDefaultTiers();
        return;
      }

      // Find the beast entry to determine its tier
      // We might need to wait if data is still loading/syncing
      const entry = templeBeastsWithDetails.value.find(
        (b) => b.roomSymbol === targetId
      );

      const shouldRetryLookup = !entry && attempt < 5;
      if (shouldRetryLookup) {
        timers.startTimeout(100, () => performScrollToTarget(attempt + 1));
        return;
      }

      if (entry) {
        // FORCE the accordion to open ONLY this tier
        activeTiers.value = [entry.tier];

        // Use a slightly longer timeout to ensure Ionic's internals have registered the value change
        // and the transition has at least started.
        timers.startTimeout(300, () => {
          const elementId = `beast-card-${targetId}`;
          const element = document.getElementById(elementId);

          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("beast-card-highlight");
            timers.startTimeout(2000, () =>
              element.classList.remove("beast-card-highlight")
            );
          }

          // Final cleanup
          creatorStore.pendingScrollId = null;
          if (hash) {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
          }
        });
      } else {
        updateDefaultTiers();
      }
    };

    onIonViewDidEnter(() => {
      performScrollToTarget();
      // A quest edited in the Compendium since the tab last showed changes its row and its dots
      void quests.load();
    });

    onMounted(() => {
      const hasNoActiveTiers = activeTiers.value.length === 0;
      if (hasNoActiveTiers) {
        updateDefaultTiers();
      }
      void quests.load();
    });

    const openBeastSelector = (entry: TempleBeast) => {
      // Get current beasts for this room
      const currentBeasts = entry.beast ? [entry.beastId] : [];

      // Start selection with callback to update room data
      selectionStore.startSelection(
        currentBeasts,
        "temple-beasts-tab",
        (selectedIds) => {
          const layout = temple.value.dungeonLayout;
          if (!layout) return;

          const heldRoom = layout.rooms[entry.roomSymbol];
          let targetSymbol = entry.roomSymbol;

          // PROMOTION LOGIC:
          // A symbol many cells share (a config token like MINI, or the wall) cannot hold one cell's own beasts, so the
          // cell takes a symbol of its own. A room's own symbol (R001, M0201) is already its own and is edited in place.
          if (isSharedConfigToken(targetSymbol)) {
            const newSymbol = creatorStore.generateUniqueSymbol(entry.row, entry.col, heldRoom?.type ?? entry.tier);
            const maze = layout.maze;

            // Update the maze grid
            if (Array.isArray(maze)) {
              maze[entry.row][entry.col] = newSymbol;
            } else {
              const floorGrid = maze[entry.floor] as string[][];
              if (floorGrid) {
                floorGrid[entry.row][entry.col] = newSymbol;
              }
            }

            // Use the new symbol
            targetSymbol = newSymbol;
          }

          // The room keeps what it had (sides, lockOnEnter, difficulty); only the beast tapped is replaced
          const room = withPickedBeast(heldRoom, resolveRoomTypeFromTier(entry.tier), entry.beastId, selectedIds);
          layout.rooms[targetSymbol] = room;

          // Sync with creator store
          creatorStore.roomsData[targetSymbol] = JSON.parse(JSON.stringify(room));

          // Persist the change to DB
          saveTemple();

          // Set pending scroll target for return navigation
          creatorStore.pendingScrollId = targetSymbol;
        }
      );

      ionRouter.push({ name: "xp-bestiary-select" });
    };

    return {
      quests,
      view,
      TIERS,
      activeTiers,
      onAccordionChange,
      classicEntries,
      roomCount,
      totalRooms,
      hasRooms,
      openBeastSelector,
      navigateToRoom,
      skullOutline,
    };
  },
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "../quests/questCard" as *;

.xp-temple-beasts {
  --background: transparent;
}

.transparent-content {
  --background: transparent;
}

.content-wrapper {
  padding: 8px 16px 24px;
  max-width: 900px;
  margin: 0 auto;
}

.stat-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);

  i {
    font-size: 1rem;
  }
}

/* Tier Accordion */
.tier-accordion {
  margin-bottom: 12px;
  border-radius: 16px;
  overflow: hidden;
  background: transparent;

  &::part(header) {
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
  }

  &::part(content) {
    background: transparent;
    padding: 0;
  }

  &.accordion-expanded::part(header) {
    border-radius: 16px 16px 0 0;
  }

  &.boss-tier {
    .tier-icon {
      background: rgba(255, 215, 0, 0.2);
    }

    .tier-icon i {
      color: gold;
    }
  }

  &.miniboss-tier {
    .tier-icon {
      background: rgba(180, 100, 255, 0.2);
    }

    .tier-icon i {
      color: #b464ff;
    }
  }

  &.monster-tier {
    .tier-icon {
      background: rgba(var(--ion-color-danger-rgb), 0.2);
    }

    .tier-icon i {
      color: var(--ion-color-danger);
    }
  }
}

.tier-header {
  --background: transparent;
  --color: white;
  --padding-start: 16px;
  --inner-padding-end: 16px;

  .tier-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    margin-right: 14px;

    i {
      font-size: 1.2rem;
    }
  }

  ion-label {
    h2 {
      font-family: var(--xp-font-heading);
      font-size: 1rem;
      color: white;
      margin: 0 0 2px;
    }

    p {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }
  }
}

.tier-content {
  background: rgba(15, 17, 30, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-top: none;
  border-radius: 0 0 16px 16px;
}

/* Quest rooms: the rows themselves are TempleQuestRowCard */
.quest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 12px;
  list-style: none;
}

.classic-label {
  margin: 0;
  padding: 4px 16px 0;
  font-family: $eb-font-status;
  font-size: 0.85rem;
  color: rgba(231, 230, 179, 0.6);
}

/* Beast Grid (classic beast rooms) */
.beast-grid {
  padding: 12px;
}

.beast-card-wrapper {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-4px);
  }

  &.beast-card-highlight {
    animation: beast-selection-pulse 2s ease-out;
  }
}

@keyframes beast-selection-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0.7);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 20px 10px rgba(var(--ion-color-primary-rgb), 0);
    transform: scale(1.05);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0);
    transform: scale(1);
  }
}

.room-info-overlay {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  z-index: 10;
}

.config-token-badge {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Press Start 2P";
  font-size: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.small {
    padding: 1px 4px;
    font-size: 0.4rem;
  }
}

/* Placeholder Beast Cards */
.placeholder-beast {
  aspect-ratio: 1/1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(25, 27, 46, 0.6);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  transition: all 0.2s ease;

  i {
    opacity: 0.5;
  }

  .beast-name {
    font-family: "Press Start 2P";
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
  }

  &.boss {
    border-color: rgba(255, 215, 0, 0.3);

    i {
      color: gold;
    }
  }

  &.miniboss {
    border-color: rgba(180, 100, 255, 0.3);

    i {
      color: #b464ff;
    }
  }

  &.monster {
    border-color: rgba(var(--ion-color-danger-rgb), 0.3);

    i {
      color: var(--ion-color-danger);
    }
  }
}

/* Empty State */
.glass-card {
  background: rgba(25, 27, 46, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  text-align: center;

  &.empty-state {
    .empty-icon {
      font-size: 3rem;
      color: rgba(255, 255, 255, 0.3);
      margin-bottom: 16px;
    }

    h2 {
      font-family: var(--xp-font-heading);
      font-size: 1.1rem;
      color: white;
      margin: 0 0 8px;
    }

    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.5;
    }
  }
}

/* Utility */
.text-warning {
  color: var(--ion-color-warning);
}

.text-tertiary {
  color: var(--ion-color-tertiary);
}

/* Wake quests: a dock above the tab bar, under the thumb */
.quests-dock {
  --background: transparent;

  &::before {
    display: none;
  }

  .dock {
    @include dock;
  }
}

.wake-open {
  @include dock-button;
}

.wake-count {
  padding: 1px 8px;
  font-size: 0.8rem;
  color: $eb-color-pale-yellow;
  background: $eb-color-dark-purple;
  border-radius: 10px;
}
</style>
