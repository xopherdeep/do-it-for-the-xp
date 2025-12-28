<template>
  <ion-page class="xp-temple-beasts">
    <ion-content class="transparent-content">
      <div class="content-wrapper">
        <!-- Summary Header -->
        <div
          class="summary-header"
          v-if="templeBeastsWithDetails.length > 0"
        >
          <div class="stat-pills">
            <div class="stat-pill">
              <i class="fad fa-dragon"></i>
              <span>{{ templeBeastsWithDetails.length }} Threats</span>
            </div>
            <div
              class="stat-pill"
              v-if="bossCount > 0"
            >
              <i class="fad fa-crown text-warning"></i>
              <span>{{ bossCount }} Boss{{ bossCount !== 1 ? 'es' : '' }}</span>
            </div>
            <div
              class="stat-pill"
              v-if="minibossCount > 0"
            >
              <i class="fad fa-helmet-battle text-tertiary"></i>
              <span>{{ minibossCount }} Miniboss{{ minibossCount !== 1 ? 'es' : '' }}</span>
            </div>
          </div>
        </div>

        <!-- Beasts Grouped by Tier -->
        <ion-accordion-group
          v-if="templeBeastsWithDetails.length > 0"
          :value="activeTiers"
          :multiple="true"
          @ionChange="onAccordionChange"
        >
          <!-- Boss Tier -->
          <ion-accordion
            v-if="getBeastsByTierGroup('boss').length > 0"
            value="boss"
            class="tier-accordion boss-tier"
          >
            <ion-item
              slot="header"
              class="tier-header"
            >
              <div class="tier-icon boss">
                <i class="fad fa-crown"></i>
              </div>
              <ion-label>
                <h2>Bosses</h2>
                <p>{{ getBeastsByTierGroup('boss').length }} encounter{{ getBeastsByTierGroup('boss').length !== 1 ? 's'
                  : '' }}</p>
              </ion-label>
            </ion-item>

            <div
              slot="content"
              class="beast-grid"
            >
              <ion-grid>
                <ion-row>
                  <ion-col
                    size="6"
                    size-md="4"
                    size-lg="3"
                    v-for="entry in getBeastsByTierGroup('boss')"
                    :key="`${entry.roomSymbol}-${entry.beastId}`"
                    :id="`beast-card-${entry.roomSymbol}`"
                  >
                    <div
                      class="beast-card-wrapper"
                      @click="openBeastSelector(entry)"
                    >
                      <XpBeastSelectorItem
                        v-if="entry.beast"
                        :id="entry.beast.id"
                        :name="entry.beast.name"
                        :avatar="entry.beast.avatar"
                        :bg1="entry.beast.bg1"
                        :bg2="entry.beast.bg2"
                      />
                      <div
                        v-else
                        class="placeholder-beast boss"
                      >
                        <i class="fad fa-crown fa-3x"></i>
                        <span class="beast-name">Boss Room</span>
                      </div>
                      <div
                        class="room-badge"
                        @click.stop="navigateToRoom(entry)"
                      >
                        <i class="fas fa-map-marker-alt"></i>
                        {{ entry.floor }} {{ entry.roomCoords }}
                      </div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </div>
          </ion-accordion>

          <!-- Miniboss Tier -->
          <ion-accordion
            v-if="getBeastsByTierGroup('miniboss').length > 0"
            value="miniboss"
            class="tier-accordion miniboss-tier"
          >
            <ion-item
              slot="header"
              class="tier-header"
            >
              <div class="tier-icon miniboss">
                <i class="fad fa-helmet-battle"></i>
              </div>
              <ion-label>
                <h2>Minibosses</h2>
                <p>{{ getBeastsByTierGroup('miniboss').length }} encounter{{ getBeastsByTierGroup('miniboss').length !==
                  1 ? 's' : '' }}</p>
              </ion-label>
            </ion-item>

            <div
              slot="content"
              class="beast-grid"
            >
              <ion-grid>
                <ion-row>
                  <ion-col
                    size="6"
                    size-md="4"
                    size-lg="3"
                    v-for="entry in getBeastsByTierGroup('miniboss')"
                    :key="`${entry.roomSymbol}-${entry.beastId}`"
                    :id="`beast-card-${entry.roomSymbol}`"
                  >
                    <div
                      class="beast-card-wrapper"
                      @click="openBeastSelector(entry)"
                    >
                      <XpBeastSelectorItem
                        v-if="entry.beast"
                        :id="entry.beast.id"
                        :name="entry.beast.name"
                        :avatar="entry.beast.avatar"
                        :bg1="entry.beast.bg1"
                        :bg2="entry.beast.bg2"
                      />
                      <div
                        v-else
                        class="placeholder-beast miniboss"
                      >
                        <i class="fad fa-helmet-battle fa-3x"></i>
                        <span class="beast-name">Miniboss</span>
                      </div>
                      <div
                        class="room-badge"
                        @click.stop="navigateToRoom(entry)"
                      >
                        <i class="fas fa-map-marker-alt"></i>
                        {{ entry.floor }} {{ entry.roomCoords }}
                      </div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </div>
          </ion-accordion>

          <!-- Monster Tier -->
          <ion-accordion
            v-if="getBeastsByTierGroup('monster').length > 0"
            value="monster"
            class="tier-accordion monster-tier"
          >
            <ion-item
              slot="header"
              class="tier-header"
            >
              <div class="tier-icon monster">
                <i class="fad fa-skull"></i>
              </div>
              <ion-label>
                <h2>Monsters</h2>
                <p>{{ getBeastsByTierGroup('monster').length }} encounter{{ getBeastsByTierGroup('monster').length !== 1
                  ? 's' : '' }}</p>
              </ion-label>
            </ion-item>

            <div
              slot="content"
              class="beast-grid"
            >
              <ion-grid>
                <ion-row>
                  <ion-col
                    size="4"
                    size-md="3"
                    size-lg="2"
                    v-for="entry in getBeastsByTierGroup('monster')"
                    :key="`${entry.roomSymbol}-${entry.beastId}`"
                    :id="`beast-card-${entry.roomSymbol}`"
                  >
                    <div
                      class="beast-card-wrapper"
                      @click="openBeastSelector(entry)"
                    >
                      <XpBeastSelectorItem
                        v-if="entry.beast"
                        :id="entry.beast.id"
                        :name="entry.beast.name"
                        :avatar="entry.beast.avatar"
                        :bg1="entry.beast.bg1"
                        :bg2="entry.beast.bg2"
                      />
                      <div
                        v-else
                        class="placeholder-beast monster"
                      >
                        <i class="fad fa-skull fa-2x"></i>
                        <span class="beast-name">Monster</span>
                      </div>
                      <div
                        class="room-badge small"
                        @click.stop="navigateToRoom(entry)"
                      >
                        <i class="fas fa-map-marker-alt"></i>
                        {{ entry.roomCoords }}
                      </div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <!-- Empty State -->
        <div
          class="glass-card empty-state"
          v-else
        >
          <ion-icon
            :icon="skullOutline"
            class="empty-icon"
          ></ion-icon>
          <h2>No Beasts Yet</h2>
          <p>Add monster, miniboss, or boss rooms in the Layout tab to populate this dungeon with threats.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { useRoute } from "vue-router";
import { 
  IonPage, IonContent, IonIcon, IonGrid, IonRow, IonCol,
  IonAccordionGroup, IonAccordion, IonItem, IonLabel, useIonRouter,
  onIonViewDidEnter
} from "@ionic/vue";
import { skullOutline } from 'ionicons/icons';
import { TempleBeast } from "../../composables/useTempleData";
import XpBeastSelectorItem from "@/views/App/SideMenu/XpGameMaster/XpBestiary/components/XpBeastSelectorItem.vue";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { TempleDataInjectionKey } from "../../composables/useTempleData";
import { inject, onMounted } from "vue";

export default defineComponent({
  name: "xp-temple-beasts",
  components: { 
    IonPage, IonContent, IonIcon, IonGrid, IonRow, IonCol,
    IonAccordionGroup, IonAccordion, IonItem, IonLabel,
    XpBeastSelectorItem
  },
  setup() {
    const route = useRoute();
    const ionRouter = useIonRouter();
    const templeId = route.params.templeId as string;
    
    // Inject shared temple data from XpTempleSettings
    const { 
      templeBeastsWithDetails, 
      temple, 
      saveTemple 
    } = inject(TempleDataInjectionKey)!;
    
    const selectionStore = useBestiarySelectionStore();
    const creatorStore = useTempleCreatorStore();

    const bossCount = computed(() => 
      templeBeastsWithDetails.value.filter(b => b.tier === 'boss').length
    );
    
    const minibossCount = computed(() => 
      templeBeastsWithDetails.value.filter(b => b.tier === 'miniboss').length
    );

    const getBeastsByTierGroup = (tier: 'boss' | 'miniboss' | 'monster'): TempleBeast[] => {
      return templeBeastsWithDetails.value.filter(b => b.tier === tier);
    };

    const activeTiers = ref<string[]>([]);
    
    const updateDefaultTiers = () => {
      const tiers: string[] = [];
      if (getBeastsByTierGroup('boss').length > 0) tiers.push('boss');
      if (getBeastsByTierGroup('miniboss').length > 0) tiers.push('miniboss');
      if (getBeastsByTierGroup('monster').length > 0) tiers.push('monster');
      activeTiers.value = tiers;
    };

    const onAccordionChange = (ev: CustomEvent) => {
      activeTiers.value = Array.isArray(ev.detail.value) ? ev.detail.value : [ev.detail.value].filter(Boolean);
    };

    const navigateToRoom = (entry: TempleBeast) => {
      ionRouter.push({
        name: 'xp-temple-room-editor',
        params: {
          templeId,
          row: entry.row.toString(),
          col: entry.col.toString()
        }
      });
    };

    // Auto-scroll logic when returning to the tab
    const performScrollToTarget = (attempt = 0) => {
      const hash = window.location.hash;
      const targetId = creatorStore.pendingScrollId || (hash.startsWith('#beast-card-') ? hash.substring(12) : null);
      
      if (!targetId) {
        if (activeTiers.value.length === 0) updateDefaultTiers();
        return;
      }

      // Find the beast entry to determine its tier
      // We might need to wait if data is still loading/syncing
      const entry = templeBeastsWithDetails.value.find(b => b.roomSymbol === targetId);
      
      if (!entry && attempt < 5) {
        setTimeout(() => performScrollToTarget(attempt + 1), 100);
        return;
      }

      if (entry) {
        // FORCE the accordion to open ONLY this tier
        activeTiers.value = [entry.tier];
        
        // Use a slightly longer timeout to ensure Ionic's internals have registered the value change
        // and the transition has at least started.
        setTimeout(() => {
          const elementId = `beast-card-${targetId}`;
          const element = document.getElementById(elementId);
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('beast-card-highlight');
            setTimeout(() => element.classList.remove('beast-card-highlight'), 2000);
          }
          
          // Final cleanup
          creatorStore.pendingScrollId = null;
          if (hash) {
             window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }, 300);
      } else {
        updateDefaultTiers();
      }
    };

    onIonViewDidEnter(() => {
      performScrollToTarget();
    });

    onMounted(() => {
      if (activeTiers.value.length === 0) {
        updateDefaultTiers();
      }
    });

    const openBeastSelector = (entry: TempleBeast) => {
      // Get current beasts for this room
      const currentBeasts = entry.beast ? [entry.beastId] : [];
      
      // Start selection with callback to update room data
      selectionStore.startSelection(
        currentBeasts,
        'temple-beasts-tab',
        (selectedIds) => {
          if (!temple.value.dungeonLayout) return;

          let targetSymbol = entry.roomSymbol;
          
          // PROMOTION LOGIC: 
          // If the current symbol is a shorthand/shared one (like '____', 'O__O', etc.)
          // we MUST promote it to a unique 'Rxxx' ID so this specific cell can have its own data.
          // Note: ROOM_WALL is usually '____' and EMPTY is often 'O__O' in some templates.
          const isSharedSymbol = !targetSymbol.startsWith('R') && targetSymbol !== '_00_';
          
          if (isSharedSymbol) {
            const newSymbol = creatorStore.generateUniqueSymbol();
            const maze = temple.value.dungeonLayout.maze;

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

          // Update room data with the selected beasts
          if (!temple.value.dungeonLayout.rooms[targetSymbol]) {
            // Initialize room if it doesn't exist
            temple.value.dungeonLayout.rooms[targetSymbol] = { 
              type: entry.tier === 'monster' ? 'monster' : (entry.tier === 'miniboss' ? 'miniboss' : 'boss')
            };
          }

          const roomData = temple.value.dungeonLayout.rooms[targetSymbol];
          if (roomData) {
            if (!roomData.content) roomData.content = {};
            roomData.content.beasts = selectedIds;
            
            // Sync with creator store
            creatorStore.roomsData[targetSymbol] = JSON.parse(JSON.stringify(roomData));
            
            // Persist the change to DB
            saveTemple();

            // Set pending scroll target for return navigation
            creatorStore.pendingScrollId = targetSymbol;
          }
        }
      );
      
      ionRouter.push({ name: 'xp-bestiary-select' });
    };

    return {
      templeBeastsWithDetails,
      activeTiers,
      onAccordionChange,
      bossCount,
      minibossCount,
      getBeastsByTierGroup,
      openBeastSelector,
      navigateToRoom,
      skullOutline
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-temple-beasts {
    --background: transparent;
  }

  .transparent-content {
    --background: transparent;
  }

  .content-wrapper {
    padding: 0 16px 40px;
    max-width: 900px;
    margin: 0 auto;
  }

  /* Summary Header */
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .stat-pills {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
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

  /* Beast Grid */
  .beast-grid {
    padding: 12px;
    background: rgba(15, 17, 30, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-top: none;
    border-radius: 0 0 16px 16px;
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

  .room-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(var(--ion-color-tertiary-rgb), 0.2);
    backdrop-filter: blur(12px);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-family: "StatusPlz";
    color: white;
    white-space: nowrap;
    border: 1px solid rgba(var(--ion-color-tertiary-rgb), 0.4);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(var(--ion-color-tertiary-rgb), 0.4);
      transform: translateY(-2px);
      border-color: var(--ion-color-tertiary);
    }

    i {
      margin-right: 4px;
      color: var(--ion-color-tertiary);
    }

    &.small {
      padding: 4px 8px;
      font-size: 0.7rem;
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
</style>
