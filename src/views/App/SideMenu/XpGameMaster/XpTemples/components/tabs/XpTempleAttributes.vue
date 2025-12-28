<template>
  <ion-page class="xp-temple-attributes">
    <ion-content class="transparent-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>

      <div v-else class="content-wrapper">
        <div class="segment-content">
          <!-- General Settings -->
          <div v-show="activeTab === 'general'" class="glass-card basic-info">
            <h3 class="section-title">Temple Metadata</h3>
            
            <div class="input-group">
              <ion-label>Temple Name</ion-label>
              <div class="custom-input">
                <input v-model="temple.customName" placeholder="Enter custom name" />
              </div>
            </div>

            <div class="input-group">
              <ion-label>Description</ion-label>
              <div class="custom-input">
                <textarea v-model="temple.customDescription" placeholder="Enter description" rows="3"></textarea>
              </div>
            </div>

            <div class="input-group">
              <ion-label>Associated Domains</ion-label>
              <ion-select
                v-model="temple.categoryIds"
                placeholder="Select categories..."
                interface="popover"
                :multiple="true"
                class="custom-select"
              >
                <ion-select-option
                  v-for="cat in categories"
                  :value="cat.id"
                  :key="cat.id"
                >
                  {{ cat.name }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="category-chips" v-if="temple.categoryIds && temple.categoryIds.length">
              <ion-chip 
                v-for="catId in temple.categoryIds" 
                :key="catId"
                :class="getCategoryColor(catId)"
                outline
              >
                <ion-icon :icon="getCategoryIcon(catId)"></ion-icon>
                <ion-label>{{ getCategoryName(catId) }}</ion-label>
              </ion-chip>
            </div>

            <ion-button expand="block" color="primary" @click="saveTemple" class="save-btn">
              <ion-icon :icon="saveOutline" slot="start"></ion-icon>
              Save Configuration
            </ion-button>
          </div>

          <!-- Dungeon Audit -->
          <div v-show="activeTab === 'audit'" class="glass-card dungeon-audit-full">
            <h3 class="section-title">Dungeon Audit</h3>
            
            <div class="audit-grid-full">
              <div class="audit-item" :class="{ 'passed': dungeonAudit.hasMap }">
                <div class="audit-icon">
                  <i :class="['fad', getItemIcon('map')]"></i>
                </div>
                <div class="audit-info">
                  <span class="audit-label">Dungeon Map</span>
                  <span class="audit-status">{{ dungeonAudit.hasMap ? 'Placed' : 'Missing' }}</span>
                </div>
                <ion-icon :icon="dungeonAudit.hasMap ? checkmarkCircle : closeCircle" class="status-indicator"></ion-icon>
              </div>

              <div class="audit-item" :class="{ 'passed': dungeonAudit.hasCompass }">
                <div class="audit-icon">
                  <i :class="['fad', getItemIcon('compass')]"></i>
                </div>
                <div class="audit-info">
                  <span class="audit-label">Compass</span>
                  <span class="audit-status">{{ dungeonAudit.hasCompass ? 'Placed' : 'Missing' }}</span>
                </div>
                <ion-icon :icon="dungeonAudit.hasCompass ? checkmarkCircle : closeCircle" class="status-indicator"></ion-icon>
              </div>

              <div class="audit-item" :class="{ 'passed': dungeonAudit.hasBossKey }">
                <div class="audit-icon">
                  <i :class="['fad', getItemIcon('master')]"></i>
                </div>
                <div class="audit-info">
                  <span class="audit-label">Big Key</span>
                  <span class="audit-status">{{ dungeonAudit.hasBossKey ? 'Placed' : 'Missing' }}</span>
                </div>
                <ion-icon :icon="dungeonAudit.hasBossKey ? checkmarkCircle : closeCircle" class="status-indicator"></ion-icon>
              </div>
            </div>

            <div class="audit-divider"></div>

            <div class="audit-stat-hero">
              <div class="stat-main">
                <span class="stat-label">Key Balance</span>
                <div class="stat-values">
                  <span class="val-keys"><i class="fas fa-key small mr-1"></i>{{ dungeonAudit.totalKeys }} Keys</span>
                  <span class="val-sep">vs</span>
                  <span class="val-locks"><i class="fas fa-lock small mr-1"></i>{{ dungeonAudit.totalLockedDoors }} Locks</span>
                </div>
              </div>
              <div class="stat-footer" :class="dungeonAudit.keyBalance < 0 ? 'warning' : 'ok'">
                <ion-icon :icon="dungeonAudit.keyBalance < 0 ? warningOutline : checkmarkCircle"></ion-icon>
                <span>{{ dungeonAudit.keyBalance >= 0 ? 'Dungeon is beatable!' : 'Not enough keys to unlock all doors!' }}</span>
              </div>
            </div>
          </div>

          <!-- Item Navigator Map -->
          <div v-show="activeTab === 'navigator'" class="navigator-segment-content">
            <div class="glass-card item-navigator-section">
              <div class="navigator-header">
                <h3 class="section-title">Item Navigator</h3>
                <p>Visualizing key item and goal placement across all floors.</p>
              </div>

              <div class="item-maps-grid">
                <div 
                  v-for="(grid, floorId) in itemMapData" 
                  :key="floorId" 
                  class="floor-item-map"
                >
                  <div class="floor-label">{{ floorId }}</div>
                  <div class="compact-map">
                    <div v-for="(row, y) in grid" :key="y" class="map-row">
                      <div 
                        v-for="(cell, x) in row" 
                        :key="x" 
                        class="map-cell"
                        :class="{ 
                          'is-room': cell.isRoom,
                          'has-item': !!cell.item,
                          'lock-n': cell.lockedEdges?.north,
                          'lock-e': cell.lockedEdges?.east,
                          'lock-s': cell.lockedEdges?.south,
                          'lock-w': cell.lockedEdges?.west
                        }"
                      >
                        <i v-if="cell.isEntrance" class="fas fa-door-open entrance-icon"></i>
                        <i v-else-if="cell.isBoss" class="fad fa-crown boss-icon"></i>
                        <i v-else-if="cell.item" :class="['fad', getItemIcon(cell.item === 'master-key' ? 'master' : cell.item)]"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useRoute } from "vue-router";
import { 
  IonPage, IonContent, IonButton, IonIcon, IonLabel, IonSelect, IonSelectOption, IonChip
} from "@ionic/vue";
import { 
  saveOutline, cloudOutline, leafOutline, waterOutline,
  flameOutline, snowOutline, sunnyOutline, moonOutline,
  homeOutline, diamondOutline, flashOutline, starOutline,
  checkmarkCircle, closeCircle, warningOutline, informationCircleOutline
} from 'ionicons/icons';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { TempleDataInjectionKey } from "../../composables/useTempleData";
import { inject } from "vue";

export default defineComponent({
  name: "xp-temple-attributes",
  props: {
    templeId: {
      type: String,
      required: true
    },
    tab: {
      type: String,
      default: 'general'
    }
  },
  components: { 
    IonPage, IonContent, IonButton, IonIcon, IonLabel, 
    IonSelect, IonSelectOption, IonChip,
    XpLoading
  },
  setup(props) {
    const route = useRoute();
    
    // Use the prop 'tab' if provided, otherwise check route params
    const activeTab = computed(() => props.tab || (route.params.tab as string) || 'general');

    const { 
      temple, 
      categories, 
      saveTemple, 
      getCategoryColor, 
      getCategoryName,
      dungeonAudit,
      itemMapData,
      getItemIcon,
      isLoading
    } = inject(TempleDataInjectionKey)!;

    // TODO: move this mapping to a shared location or update useTempleData to return icons
    const getCategoryIcon = (catId: string) => {
      const iconMap: Record<string, string> = {
        'combat': flashOutline,
        'crafting': diamondOutline,
        'magic': starOutline,
        'dungeon': homeOutline,
        'wind': cloudOutline,
        'water': waterOutline,
        'fire': flameOutline,
        'earth': leafOutline,
        'ice': snowOutline,
        'light': sunnyOutline,
        'shadow': moonOutline
      };
      return iconMap[catId] || starOutline;
    };

    return {
      temple,
      categories,
      saveTemple,
      getCategoryColor,
      getCategoryName,
      getCategoryIcon,
      dungeonAudit,
      itemMapData,
      getItemIcon,
      activeTab,
      isLoading,
      saveOutline,
      checkmarkCircle,
      closeCircle,
      warningOutline,
      informationCircleOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.transparent-content {
  --background: transparent;
}

.loading-wrapper-centered {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 40px;
}

.content-wrapper {
  padding: 16px 16px 60px; // Extra padding for the nested tab bar
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.glass-card {
  background: rgba(25, 27, 46, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.section-title {
  font-family: var(--xp-font-heading);
  font-size: 1.1rem;
  color: white;
  margin: 0 0 20px;
  letter-spacing: 1px;
}

/* Auditing Full View */
.audit-grid-full {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.audit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;

  &.passed {
    border-color: rgba(var(--ion-color-success-rgb), 0.3);
    .status-indicator { color: var(--ion-color-success); }
  }

  &:not(.passed) {
    .status-indicator { color: rgba(255, 255, 255, 0.1); }
  }

  .audit-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    i { font-size: 1.5rem; }
  }

  .audit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    .audit-label { font-size: 1rem; color: white; }
    .audit-status { font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px; }
  }

  .status-indicator { font-size: 1.5rem; }
}

.audit-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 16px 0;
}

.audit-stat-hero {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;

  .stat-main {
    margin-bottom: 12px;
    .stat-label { font-size: 0.9rem; color: rgba(255, 255, 255, 0.5); display: block; margin-bottom: 8px; }
    .stat-values {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      font-family: "StatusPlz";
      font-size: 1.4rem;
      
      .val-keys { color: var(--ion-color-primary); }
      .val-sep { color: rgba(255, 255, 255, 0.2); font-size: 1rem; }
      .val-locks { color: var(--ion-color-danger); }
    }
  }

  .stat-footer {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    padding: 6px 16px;
    border-radius: 20px;
    background: rgba(0, 0, 0, 0.3);
    
    &.ok { color: var(--ion-color-success); border: 1px solid rgba(var(--ion-color-success-rgb), 0.2); }
    &.warning { color: var(--ion-color-warning); border: 1px solid rgba(var(--ion-color-warning-rgb), 0.2); }
  }
}

/* Item Navigator Section */
.navigator-segment-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.item-navigator-section {
  .navigator-header {
    margin-bottom: 24px;
    p { font-family: "Apple Kid"; font-size: 1rem; color: rgba(255, 255, 255, 0.5); margin: -10px 0 0; }
  }
}

.item-maps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.floor-item-map {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .floor-label {
    font-family: "StatusPlz";
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    text-align: center;
  }
}

.compact-map {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  .map-row { display: flex; gap: 2px; }

  .map-cell {
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    position: relative;
    box-sizing: border-box;

    &.is-room {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    &.has-item {
      color: var(--ion-color-primary);
    }

    /* Locked Door Edges */
    &[class*="lock-"]::before {
      content: '';
      position: absolute;
      background: var(--ion-color-danger);
      box-shadow: 0 0 8px var(--ion-color-danger);
      z-index: 5;
    }

    &.lock-n::before { top: -2px; left: 20%; right: 20%; height: 3px; }
    &.lock-e::before { right: -2px; top: 20%; bottom: 20%; width: 3px; }
    &.lock-s::before { bottom: -2px; left: 20%; right: 20%; height: 3px; }
    &.lock-w::before { left: -2px; top: 20%; bottom: 20%; width: 3px; }

    .entrance-icon { font-size: 0.7rem; color: #fff; }
    .boss-icon { color: var(--ion-color-warning); font-size: 1.1rem; }
  }
}

/* Inputs */
.input-group {
  margin-bottom: 20px;
  ion-label { font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; display: block; }
  .custom-input, .custom-select { background: rgba(0, 0, 0, 0.3); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1);
    input, textarea { width: 100%; background: transparent; border: none; padding: 12px; color: white; font-family: inherit; resize: none; font-size: 1rem; }
  }
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.save-btn {
  margin-top: 20px;
  --border-radius: 12px;
  height: 50px;
  font-family: var(--xp-font-heading);
}
</style>
