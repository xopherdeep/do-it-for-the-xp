<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/game-master"></ion-back-button>
        </ion-buttons>
        <ion-title>Temple Master Console</ion-title>
        <ion-buttons slot="end" >
          <ion-button @click="goToTempleCreator" color="rpg">
            <ion-icon :icon="gridOutline" slot="start"></ion-icon>
            <ion-label>Creator</ion-label>
          </ion-button>
          <ion-button @click="saveTemple" color="rpg">
            <ion-icon :icon="saveOutline" slot="start"></ion-icon>
            <ion-label>Save</ion-label>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Temple Header with Background -->
      <div class="temple-header" :style="{ backgroundImage: getTempleBg() }">
        <div class="temple-overlay">
          <ion-avatar class="temple-icon">
            <ion-icon :icon="getTempleIonicIcon()" size="large"></ion-icon>
          </ion-avatar>
          <h1>{{ getDisplayName() }}</h1>
          <p>{{ getDisplayDescription() }}</p>
        </div>
      </div>

      <!-- Temple Status Overview -->
      <ion-card class="status-card ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Temple Status</ion-card-subtitle>
          <ion-card-title class="status-title">
            <span>Level {{ temple.level || 1 }}</span>
            <ion-chip :color="getTempleColor()">
              <ion-icon :icon="getTempleIonicIcon()"></ion-icon>
              <ion-label>{{ getTempleName() }}</ion-label>
            </ion-chip>
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="status-grid">
            <!-- Development Progress -->
            <div class="status-item">
              <div class="status-label">Development</div>
              <ion-progress-bar 
                :value="(temple.level || 1) / 10" 
                :color="getProgressColor(temple.level || 1, 10)"
              ></ion-progress-bar>
              <div class="status-detail">{{ temple.level || 1 }}/10</div>
            </div>

            <!-- Power Rating -->
            <div class="status-item">
              <div class="status-label">Power Rating</div>
              <div class="rating-stars">
                <i class="fas fa-star" v-for="n in Math.floor(calculatePowerRating()/20)" :key="n"></i>
                <i class="far fa-star" v-for="n in (5 - Math.floor(calculatePowerRating()/20))" :key="`empty-${n}`"></i>
              </div>
              <div class="status-detail">{{ calculatePowerRating() }}/100</div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Exploration Stats -->
      <ion-card class="exploration-card ion-margin" v-if="dungeonStats.totalRooms > 0">
        <ion-card-header>
          <ion-card-subtitle>Temple Exploration</ion-card-subtitle>
          <ion-card-title>
            {{ Math.round((dungeonStats.visitedRooms / dungeonStats.totalRooms) * 100) }}% Explored
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>Rooms Discovered</ion-label>
            <ion-badge slot="end" color="primary">{{ dungeonStats.visitedRooms || 0 }}/{{ dungeonStats.totalRooms || 0 }}</ion-badge>
          </ion-item>
          <ion-progress-bar 
            :value="dungeonStats.totalRooms ? (dungeonStats.visitedRooms / dungeonStats.totalRooms) : 0" 
            color="primary"
          ></ion-progress-bar>

          <ion-item lines="none" class="ion-margin-top">
            <ion-label>Treasures Found</ion-label>
            <ion-badge slot="end" color="warning">{{ dungeonStats.foundTreasures || 0 }}/{{ dungeonStats.totalTreasures || 0 }}</ion-badge>
          </ion-item>
          <ion-progress-bar 
            :value="dungeonStats.totalTreasures ? (dungeonStats.foundTreasures / dungeonStats.totalTreasures) : 0" 
            color="warning"
          ></ion-progress-bar>

          <!-- Special Items Status -->
          <div class="special-items-container ion-margin-top">
            <div class="special-item" :class="{ active: templeState.hasMap }">
              <i class="fas fa-map"></i>
              <span>Map</span>
            </div>
            <div class="special-item" :class="{ active: templeState.hasCompass }">
              <i class="fas fa-compass"></i>
              <span>Compass</span>
            </div>
            <div class="special-item" :class="{ active: templeState.hasBossKey }">
              <i class="fas fa-key"></i>
              <span>Boss Key</span>
            </div>
            <div class="special-item keys">
              <i class="fas fa-key"></i>
              <span>{{ templeState.playerKeys || 0 }} Keys</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Monster Stats -->
      <ion-card class="monster-card ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Monster Population</ion-card-subtitle>
          <ion-card-title>{{ countedMonsters.total }} Creatures</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="monster-grid">
            <div class="monster-type">
              <div class="icon-container boss">
                <i class="fad fa-crown"></i>
              </div>
              <div class="monster-count">{{ countedMonsters.boss }}</div>
              <div class="monster-label">Bosses</div>
            </div>
            <div class="monster-type">
              <div class="icon-container miniboss">
                <i class="fad fa-helmet-battle"></i>
              </div>
              <div class="monster-count">{{ countedMonsters.miniboss }}</div>
              <div class="monster-label">Minibosses</div>
            </div>
            <div class="monster-type">
              <div class="icon-container large">
                <i class="fad fa-dragon"></i>
              </div>
              <div class="monster-count">{{ countedMonsters.large }}</div>
              <div class="monster-label">Large</div>
            </div>
            <div class="monster-type">
              <div class="icon-container medium">
                <i class="fad fa-skull"></i>
              </div>
              <div class="monster-count">{{ countedMonsters.medium }}</div>
              <div class="monster-label">Medium</div>
            </div>
            <div class="monster-type">
              <div class="icon-container small">
                <i class="fad fa-ghost"></i>
              </div>
              <div class="monster-count">{{ countedMonsters.small }}</div>
              <div class="monster-label">Small</div>
            </div>
          </div>
          
          <ion-button 
            expand="block" 
            fill="outline" 
            size="small" 
            color="medium"
            @click="showMonsterEditor = true"
            class="ion-margin-top"
          >
            <ion-icon :icon="buildOutline" slot="start"></ion-icon>
            Edit Monster Population
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Future Features Section -->
      <ion-card class="future-card ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Temple Management</ion-card-subtitle>
          <ion-card-title>Coming Soon</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="future-desc">
            Temple members and task tracking features are in development. These features will allow you to:
          </p>
          <ion-list lines="none">
            <ion-item>
              <ion-icon :icon="peopleOutline" slot="start" color="primary"></ion-icon>
              <ion-label>Recruit and manage temple members</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="checkmarkDoneOutline" slot="start" color="success"></ion-icon>
              <ion-label>Create and assign temple tasks</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="trophyOutline" slot="start" color="warning"></ion-icon>
              <ion-label>Track achievements and rewards</ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Temple Customization -->
      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label>Temple Customization</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="stacked">Temple Name</ion-label>
          <ion-input v-model="temple.customName" placeholder="Enter a custom name for this temple"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">Temple Description</ion-label>
          <ion-textarea
            v-model="temple.customDescription"
            placeholder="Enter a custom description for this temple"
            rows="3"
          ></ion-textarea>
        </ion-item>
      </ion-list>

      <!-- Categories Section -->
      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label>Categories</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="stacked">Related Categories</ion-label>
          <ion-select
            v-model="temple.categoryIds"
            placeholder="Choose relating categories..."
            interface="popover"
            :multiple="true"
          >
            <ion-select-option
              v-for="cat in categories"
              :value="cat.id"
              :key="cat.id"
            >
              {{ cat.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="none" v-if="temple.categoryIds && temple.categoryIds.length">
          <div class="category-chips">
            <ion-chip 
              v-for="catId in temple.categoryIds" 
              :key="catId"
              :color="getCategoryColor(catId)"
            >
              <ion-icon :icon="getCategoryIcon(catId)"></ion-icon>
              <ion-label>{{ getCategoryName(catId) }}</ion-label>
            </ion-chip>
          </div>
        </ion-item>
        
        <ion-item lines="none" v-else>
          <ion-note>No categories associated with this temple yet.</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>

    <!-- Monster Editor Popup -->
    <ion-modal :is-open="showMonsterEditor" @did-dismiss="showMonsterEditor = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Edit Monster Population</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showMonsterEditor = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item>
            <ion-label>Small Monsters</ion-label>
            <ion-input type="number" v-model.number="temple.smallMonsters" min="0"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label>Medium Monsters</ion-label>
            <ion-input type="number" v-model.number="temple.mediumMonsters" min="0"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label>Large Monsters</ion-label>
            <ion-input type="number" v-model.number="temple.largeMonsters" min="0"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label>Minibosses</ion-label>
            <ion-input type="number" v-model.number="temple.minibosses" min="0"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label>Bosses</ion-label>
            <ion-input type="number" v-model.number="temple.bosses" min="0" max="1"></ion-input>
          </ion-item>
        </ion-list>
        <div class="ion-padding">
          <ion-button expand="block" @click="saveMonsterCounts">Save Changes</ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from "vue";
import ionic from "@/mixins/ionic";
import { useRouter } from "vue-router";
import {
  AchievementCategoryInterface,
  AchievementCategoryDb,
  achievementCategoryStorage,
} from "@/databases/AchievementDb";
import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";
import { sortCategoryByName } from "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement";
import { TempleSystem } from "@/engine/core/TempleSystem";
import debug from "@/utils/debug";
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, 
  IonButton, IonContent, IonAvatar, IonIcon, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonList,
  IonListHeader, IonItem, IonLabel, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonBadge, IonProgressBar, IonCardContent, IonNote, IonChip,
  IonModal
} from '@ionic/vue';
import { 
  gridOutline, saveOutline, cloudOutline, leafOutline, waterOutline,
  flameOutline, snowOutline, sunnyOutline, moonOutline, homeOutline,
  diamondOutline, shieldOutline, flashOutline, personOutline, starOutline,
  buildOutline, peopleOutline, checkmarkDoneOutline, trophyOutline
} from 'ionicons/icons';

const requireBg = require.context("@/assets/images/backgrounds/");

export default defineComponent({
  props: ["templeId"],
  name: "xp-temple-settings",
  components: {
    IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, 
    IonButton, IonContent, IonAvatar, IonIcon, 
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonList,
    IonListHeader, IonItem, IonLabel, IonInput, IonTextarea, IonSelect,
    IonSelectOption, IonBadge, IonProgressBar, IonCardContent, IonNote, IonChip,
    IonModal
  },
  mixins: [ionic],

  setup(props) {
    const router = useRouter();
    const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
    const categories = ref([] as ExtendedCategoryInterface[]);
    const templeDb = new TempleDb(templeStorage);
    const templeSystem = TempleSystem.getInstance();
    const showMonsterEditor = ref(false);

    const loadCategories = async () => {
      categories.value = await categoryDb.getAll();
      categories.value = categories.value.sort(sortCategoryByName);
    };

    // Extend the TempleInterface to include additional properties
    interface ExtendedTempleInterface extends TempleInterface {
      smallMonsters?: number;
      mediumMonsters?: number;
      largeMonsters?: number;
      minibosses?: number;
      bosses?: number;
      hasBossKey?: boolean; // Added missing property
    }

    // Define room type for type checking
    interface TempleRoom {
      type?: string;
      visited?: boolean;
      opened?: boolean;
      content?: any;
    }

    // Extend AchievementCategoryInterface to include color and icon
    interface ExtendedCategoryInterface extends AchievementCategoryInterface {
      color?: string;
      icon?: any;
    }

    // Initialize temple state
    const temple = ref<ExtendedTempleInterface>({
      id: props.templeId,
      categoryIds: [] as string[],
      level: 1
    });

    // Temple state from the temple system
    const templeState = ref({
      hasMap: false,
      hasCompass: false,
      hasBossKey: false,
      playerKeys: 0,
      visitedPositions: new Set<string>()
    });

    const dungeonStats = ref({
      totalRooms: 0,
      visitedRooms: 0,
      totalTreasures: 0,
      foundTreasures: 0
    });

    // Computed property to count monsters in the dungeon layout
    const countedMonsters = computed(() => {
      let counts = {
        small: 0,
        medium: 0,
        large: 0,
        miniboss: 0,
        boss: 0,
        total: 0
      };

      // If we have manual counts, use those
      if (temple.value.smallMonsters !== undefined) {
        counts.small = temple.value.smallMonsters;
        counts.medium = temple.value.mediumMonsters || 0;
        counts.large = temple.value.largeMonsters || 0;
        counts.miniboss = temple.value.minibosses || 0;
        counts.boss = temple.value.bosses || 0;
      } 
      // Otherwise try to count monsters from the dungeon layout
      else if (temple.value.dungeonLayout?.rooms) {
        const rooms = temple.value.dungeonLayout.rooms;
        Object.values(rooms).forEach(room => {
          const r = room as TempleRoom;
          if (r.type === 'monster') {
            const monsterType = (r.content?.type || 'small').toLowerCase();
            if (monsterType.includes('boss')) {
              counts.boss++;
            } else if (monsterType.includes('mini')) {
              counts.miniboss++;
            } else if (monsterType.includes('large')) {
              counts.large++;
            } else if (monsterType.includes('medium')) {
              counts.medium++;
            } else {
              counts.small++;
            }
          }
        });

        // If no monsters were found, use default values
        if (counts.small + counts.medium + counts.large + counts.miniboss + counts.boss === 0) {
          counts.small = getDefaultMonsterCount('small');
          counts.medium = getDefaultMonsterCount('medium');
          counts.large = getDefaultMonsterCount('large');
          counts.miniboss = getDefaultMonsterCount('miniboss');
          counts.boss = getDefaultMonsterCount('boss');
        }
      } else {
        // No layout, use defaults
        counts.small = getDefaultMonsterCount('small');
        counts.medium = getDefaultMonsterCount('medium');
        counts.large = getDefaultMonsterCount('large');
        counts.miniboss = getDefaultMonsterCount('miniboss');
        counts.boss = getDefaultMonsterCount('boss');
      }

      // Calculate total
      counts.total = counts.small + counts.medium + counts.large + counts.miniboss + counts.boss;
      return counts;
    });

    const calculateDungeonStats = () => {
      // Get temple state from the TempleSystem if available
      const sysState = templeSystem.getTempleState(props.templeId);
      if (sysState) {
        templeState.value = {
          hasMap: sysState.hasMap,
          hasCompass: sysState.hasCompass,
          hasBossKey: !!temple.value.hasBossKey, // Now TypeScript won't complain
          playerKeys: sysState.playerKeys,
          visitedPositions: sysState.visitedRooms
        };
      }

      // If temple has dungeonLayout, calculate exploration stats
      if (temple.value.dungeonLayout) {
        const layout = temple.value.dungeonLayout;
        
        // Count total rooms from the maze
        let totalRooms = 0;
        let visitedRooms = 0;
        let totalTreasures = 0;
        let foundTreasures = 0;

        if (layout.maze && Array.isArray(layout.maze)) {
          // Count non-wall cells in the maze
          layout.maze.forEach(row => {
            row.forEach(cell => {
              if (cell !== "W" && cell !== "X") {
                totalRooms++;
              }
            });
          });
        }

        // Count visited rooms and treasures
        if (layout.rooms) {
          Object.entries(layout.rooms).forEach(([, roomData]) => {
            const room = roomData as TempleRoom;
            if (room.visited) {
              visitedRooms++;
            }
            if (room.type === 'chest' || room.type === 'treasure') {
              totalTreasures++;
              if (room.opened) {
                foundTreasures++;
              }
            }
          });
        }

        dungeonStats.value = {
          totalRooms,
          visitedRooms,
          totalTreasures,
          foundTreasures
        };
      }
    };

    // Save monster counts explicitly
    const saveMonsterCounts = async () => {
      await saveTemple();
      showMonsterEditor.value = false; 
    };

    // Watch for temple changes and autosave
    watch(temple, () => {
      // Don't actually autosave - could lead to data loss if temple becomes empty
      // Will save manually instead
      debug.log("Temple settings changed, skipping autosave");
    }, { deep: true });

    const getTempleIcon = () => {
      const icons = {
        "wind-temple": "fad fa-wind",
        "earth-temple": "fad fa-mountain",
        "water-temple": "fad fa-water",
        "fire-temple": "fad fa-fire",
        "ice-temple": "fad fa-snowflake",
        "light-temple": "fad fa-sun",
        "shadow-temple": "fad fa-moon",
      };
      return icons[props.templeId] || "fad fa-place-of-worship";
    };

    const getTempleIonicIcon = () => {
      const icons = {
        "wind-temple": cloudOutline,
        "earth-temple": leafOutline,
        "water-temple": waterOutline,
        "fire-temple": flameOutline,
        "ice-temple": snowOutline,
        "light-temple": sunnyOutline,
        "shadow-temple": moonOutline,
      };
      return icons[props.templeId] || homeOutline;
    };

    const getTempleName = () => {
      const names = {
        "wind-temple": "Temple of Zephyr",
        "earth-temple": "Gaia Sanctuary",
        "water-temple": "Aqua Haven",
        "fire-temple": "Inferno Citadel",
        "ice-temple": "Frost Keep",
        "light-temple": "Solar Sanctum",
        "shadow-temple": "Lunar Shrine",
      };
      return names[props.templeId] || props.templeId;
    };

    const getTempleDescription = () => {
      const descriptions = {
        "wind-temple": "Masters of aerial magic and swift techniques",
        "earth-temple": "Guardians of nature and earthen powers",
        "water-temple": "Wielders of healing and fluid combat",
        "fire-temple": "Home to powerful offensive spells",
        "ice-temple": "Specialists in ice magic and defense",
        "light-temple": "Light magic and restoration abilities",
        "shadow-temple": "Dark magic and mysterious arts",
      };
      return descriptions[props.templeId] || "";
    };

    const getTempleColor = () => {
      const colors = {
        "wind-temple": "primary",
        "earth-temple": "success",
        "water-temple": "tertiary",
        "fire-temple": "danger",
        "ice-temple": "light",
        "light-temple": "warning",
        "shadow-temple": "dark",
      };
      return colors[props.templeId] || "medium";
    };

    const getTempleBg = () => {
      const worlds = {
        "wind-temple": "plains",
        "earth-temple": "forest",
        "water-temple": "islands",
        "fire-temple": "mountains",
        "ice-temple": "ice",
        "light-temple": "desert",
        "shadow-temple": "moon",
      };
      const world = worlds[props.templeId] || "plains";
      try {
        const img = requireBg(`./world-${world}.jpg`);
        return `url(${img})`;
      } catch (error) {
        debug.log(`Could not find specific world background for ${world}`, error);
        // Try fallbacks in order if the specific world image doesn't exist
        try {
          const img = requireBg('./world-map.jpg');
          return `url(${img})`;
        } catch (error2) {
          debug.log(`Could not find world-map.jpg fallback background`, error2);
          try {
            const img = requireBg('./hometown.jpg');
            return `url(${img})`;
          } catch (error3) {
            debug.log(`Could not find hometown.jpg fallback background`, error3);
            // Return a gradient as last resort
            return 'linear-gradient(135deg, #2c3e50, #4a69bd)';
          }
        }
      }
    };

    const getDisplayName = () => {
      return temple.value.customName || getTempleName();
    };

    const getDisplayDescription = () => {
      return temple.value.customDescription || getTempleDescription();
    };

    const loadTempleData = async () => {
      await loadCategories();
      if (props.templeId) {
        await loadTemple(props.templeId);
      }
    };
    
    const loadTemple = async (id) => {
      const templeData = await templeDb.getTempleById(id);
      
      if (templeData) {
        // Merge the loaded data with the default template
        temple.value = {
          ...temple.value,
          ...templeData
        };
        calculateDungeonStats();
      } else {
        // Initialize with default values and save
        saveTemple();
      }
    };
    
    const saveTemple = async () => {
      const templeToSave = {
        ...temple.value,
        id: props.templeId
      };
      await templeDb.setTemple(templeToSave);
    };
    
    const goToTempleCreator = () => {
      router.push({
        name: 'xp-temple-creator',
        params: {
          templeId: props.templeId
        }
      });
    };

    const calculatePowerRating = () => {
      const level = temple.value.level || 1;
      const dungeonCompletion = dungeonStats.value.totalRooms > 0 
        ? (dungeonStats.value.visitedRooms / dungeonStats.value.totalRooms) * 50 
        : 0;
      const monsterStrength = countedMonsters.value.small * 0.5 + 
                              countedMonsters.value.medium * 1 + 
                              countedMonsters.value.large * 2 + 
                              countedMonsters.value.miniboss * 5 + 
                              countedMonsters.value.boss * 10;
      
      // New formula based on:
      // - Temple level
      // - Dungeon exploration %
      // - Monster population strength
      const rating = Math.min(100, Math.round(level * 10 + dungeonCompletion + monsterStrength * 0.5));
      return rating;
    };

    const getProgressColor = (value, max) => {
      const percentage = (value / max) * 100;
      if (percentage >= 75) return 'success';
      if (percentage >= 50) return 'warning';
      return 'danger';
    };

    const getDefaultMonsterCount = (type) => {
      const defaultCounts = {
        small: 8,
        medium: 4,
        large: 2,
        miniboss: 1,
        boss: 1
      };
      return defaultCounts[type] || 0;
    };

    const getCategoryColor = (catId) => {
      const category = categories.value.find(cat => cat.id === catId);
      if (category && category.color) return category.color;
      
      // If no color found, use a consistent color based on the category ID
      const index = (catId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 7;
      const colors = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'medium'];
      return colors[index];
    };

    const getCategoryIcon = (catId) => {
      const iconMap = {
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
      
      // Try to find an icon based on category name patterns
      const category = categories.value.find(cat => cat.id === catId);
      if (!category) return homeOutline;
      
      // Check if the category has an icon property
      if (category.icon) return category.icon;
      
      // Check the ID first
      for (const [key, icon] of Object.entries(iconMap)) {
        if (catId.toLowerCase().includes(key)) {
          return icon;
        }
      }
      
      // Then check the name
      const name = category.name.toLowerCase();
      for (const [key, icon] of Object.entries(iconMap)) {
        if (name.includes(key)) {
          return icon;
        }
      }
      
      // Default icon
      return starOutline;
    };

    const getCategoryName = (catId) => {
      const category = categories.value.find(cat => cat.id === catId);
      return category ? category.name : 'Unknown';
    };

    // Load data when component is mounted
    onMounted(() => {
      loadTempleData();
    });

    return {
      temple,
      templeState,
      categories,
      dungeonStats,
      countedMonsters,
      showMonsterEditor,
      loadCategories,
      getTempleIcon,
      getTempleIonicIcon,
      getTempleName,
      getTempleDescription,
      getTempleColor,
      getTempleBg,
      getDisplayName,
      getDisplayDescription,
      loadTemple,
      saveTemple,
      goToTempleCreator,
      calculatePowerRating,
      getProgressColor,
      getDefaultMonsterCount,
      getCategoryColor,
      getCategoryIcon,
      getCategoryName,
      calculateDungeonStats,
      saveMonsterCounts,
      // Ionic icons
      gridOutline,
      saveOutline,
      diamondOutline,
      shieldOutline,
      flashOutline, 
      personOutline,
      starOutline,
      buildOutline,
      peopleOutline,
      checkmarkDoneOutline,
      trophyOutline
    };
  },
});
</script>

<style lang="scss" scoped>
  .xp-temple-settings {
    // Header styling
    ion-toolbar {
      --background: var(--ion-color-primary);
      
      ion-title {
        font-family: var(--xp-font-fantasy, 'Fantasy');
        font-weight: 600;
      }
    }
    
    // Content styling
    ion-content {
      --background: var(--ion-background-color);
    }
    
    // Temple header
    .temple-header {
      height: 200px;
      background-size: cover;
      background-position: center;
      position: relative;
      
      .temple-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        padding: 1rem;
        text-align: center;
        
        h1 {
          margin: 0.5rem 0;
          font-family: var(--xp-font-fantasy, 'Fantasy');
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          max-width: 80%;
          opacity: 0.9;
        }
        
        .temple-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.5);
          
          ion-icon {
            color: white;
            font-size: 2rem;
          }
        }
      }
    }

    // Status card
    .status-card {
      .status-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .status-grid {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        
        .status-item {
          flex: 1;
          text-align: center;
          padding: 0 5px;
          
          .status-label {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-bottom: 5px;
          }
          
          .status-detail {
            font-size: 0.9rem;
            margin-top: 5px;
            font-weight: 500;
          }
          
          .rating-stars {
            display: flex;
            justify-content: center;
            gap: 3px;
            
            i {
              font-size: 1.2rem;
              color: var(--ion-color-warning);
            }
          }
        }
      }
    }
    
    // Special items
    .special-items-container {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px 0;
      
      .special-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        opacity: 0.6;
        
        i {
          font-size: 1.5rem;
          color: var(--ion-color-medium);
          margin-bottom: 5px;
        }
        
        span {
          font-size: 0.8rem;
        }
        
        &.active {
          opacity: 1;
          
          i {
            color: var(--ion-color-success);
          }
          
          &:nth-child(2) i {
            color: var(--ion-color-warning);
          }
          
          &:nth-child(3) i {
            color: var(--ion-color-danger);
          }
        }
        
        &.keys i {
          color: var(--ion-color-medium);
        }
      }
    }
    
    // Monster grid
    .monster-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      
      .monster-type {
        text-align: center;
        
        .icon-container {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 5px;
          
          i {
            font-size: 1.2rem;
          }
          
          &.boss {
            background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,215,0,0.1) 100%);
            border: 2px solid gold;
            
            i {
              --fa-primary-color: gold;
              --fa-secondary-color: #c17e03;
            }
          }
          
          &.miniboss {
            background: radial-gradient(circle, rgba(192,192,192,0.3) 0%, rgba(192,192,192,0.1) 100%);
            border: 2px solid silver;
            
            i {
              --fa-primary-color: silver;
              --fa-secondary-color: #666;
            }
          }
          
          &.large {
            background: radial-gradient(circle, rgba(205,127,50,0.3) 0%, rgba(205,127,50,0.1) 100%);
            border: 2px solid #cd7f32;
            
            i {
              --fa-primary-color: #cd7f32;
              --fa-secondary-color: #8b4513;
            }
          }
          
          &.medium {
            background: radial-gradient(circle, rgba(161,161,161,0.3) 0%, rgba(161,161,161,0.1) 100%);
            border: 2px solid #a1a1a1;
            
            i {
              --fa-primary-color: #a1a1a1;
              --fa-secondary-color: #666;
            }
          }
          
          &.small {
            background: radial-gradient(circle, rgba(139,139,139,0.3) 0%, rgba(139,139,139,0.1) 100%);
            border: 2px solid #8b8b8b;
            
            i {
              --fa-primary-color: #8b8b8b;
              --fa-secondary-color: #666;
            }
          }
        }
        
        .monster-count {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .monster-label {
          font-size: 0.8rem;
          opacity: 0.7;
        }
      }
    }
    
    // Future features card
    .future-card {
      .future-desc {
        margin-bottom: 15px;
        font-style: italic;
      }
      
      ion-list {
        background: transparent;
        
        ion-item {
          --background: transparent;
          --border-color: rgba(0,0,0,0.05);
          
          ion-icon {
            margin-right: 10px;
            font-size: 1.2rem;
          }
        }
      }
    }
    
    // Category chips
    .category-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 0;
      
      ion-chip {
        --background: rgba(var(--ion-color-primary-rgb), 0.1);
        border: 1px solid var(--ion-color-primary);
      }
    }
    
    // Responsive adjustments
    @media (max-width: 768px) {
      .temple-header {
        height: 150px;
        
        .temple-overlay {
          h1 {
            font-size: 1.4rem;
          }
          
          p {
            font-size: 0.8rem;
          }
          
          .temple-icon {
            width: 50px;
            height: 50px;
            
            ion-icon {
              font-size: 1.5rem;
            }
          }
        }
      }
      
      .monster-grid {
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, auto);
        
        .monster-type:nth-child(4),
        .monster-type:nth-child(5) {
          grid-column: span 1;
        }
      }
    }
  }
</style>
