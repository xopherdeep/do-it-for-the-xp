<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">


        <ion-buttons slot="start">
          <ion-back-button default-href="/game-master"></ion-back-button>
        </ion-buttons>
        <ion-title>Temple Settings</ion-title>
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
      <div class="temple-header" :style="{ backgroundImage: getTempleBg() }">
        <div class="temple-overlay">
          <ion-avatar class="temple-icon">
            <ion-icon :icon="getTempleIonicIcon()" size="large"></ion-icon>
          </ion-avatar>
          <h1>{{ getDisplayName() }}</h1>
          <p>{{ getDisplayDescription() }}</p>
        </div>
      </div>

      <ion-grid class="ion-padding">
        <ion-row>
          <ion-col size="12" size-md="4">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Members</ion-card-subtitle>
                <ion-card-title>{{ temple.memberCount || 0 }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-progress-bar 
                  :value="(temple.memberCount || 0) / 100" 
                  :color="temple.memberCount > 50 ? 'success' : 'primary'"
                ></ion-progress-bar>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="12" size-md="4">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Level</ion-card-subtitle>
                <ion-card-title>{{ temple.level || 1 }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-progress-bar 
                  :value="(temple.level || 1) / 10" 
                  :color="getProgressColor(temple.level || 1, 10)"
                ></ion-progress-bar>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="12" size-md="4">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Tasks</ion-card-subtitle>
                <ion-card-title>{{ temple.taskCount || 0 }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-progress-bar 
                  :value="(temple.taskCount || 0) / 50" 
                  :color="temple.taskCount > 25 ? 'success' : 'warning'"
                ></ion-progress-bar>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-card class="power-card ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Temple Power Rating</ion-card-subtitle>
          <ion-card-title>{{ calculatePowerRating() }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="rating-stars">
            <i class="fas fa-star" v-for="n in Math.floor(calculatePowerRating()/20)" :key="n"></i>
            <i class="far fa-star" v-for="n in (5 - Math.floor(calculatePowerRating()/20))" :key="`empty-${n}`"></i>
          </div>
          <p>Based on level, members, and completed tasks</p>
        </ion-card-content>
      </ion-card>

      <ion-card class="exploration-card ion-margin" v-if="dungeonStats">
        <ion-card-header>
          <ion-card-subtitle>Temple Exploration</ion-card-subtitle>
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

          <ion-item lines="none" class="ion-margin-top">
            <ion-label>Keys Collected</ion-label>
            <ion-badge slot="end" color="medium">{{ temple.keyCount || 0 }}</ion-badge>
          </ion-item>

          <ion-item lines="none" class="ion-margin-top">
            <ion-label>Special Items</ion-label>
            <div class="special-items" slot="end">
              <div class="special-item" :class="{ active: temple.hasMap || false }">
                <i class="fas fa-map" :style="{ color: temple.hasMap ? 'var(--ion-color-success)' : 'gray' }"></i>
              </div>
              <div class="special-item" :class="{ active: temple.hasCompass || false }">
                <i class="fas fa-compass" :style="{ color: temple.hasCompass ? 'var(--ion-color-warning)' : 'gray' }"></i>
              </div>
              <div class="special-item" :class="{ active: temple.hasBossKey || false }">
                <i class="fas fa-key" :style="{ color: temple.hasBossKey ? 'var(--ion-color-danger)' : 'gray' }"></i>
              </div>
            </div>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-card class="monster-population-card ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Monster Population</ion-card-subtitle>
          <ion-card-title>{{ calculateTotalMonsters() }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <div class="icon-container small" slot="start">
                <i class="fad fa-ghost" style="--fa-primary-color: #8b8b8b; --fa-secondary-color: #666"></i>
              </div>
              <ion-label>Small Monsters</ion-label>
              <ion-note slot="end">{{ temple.smallMonsters || getDefaultMonsterCount('small') }}</ion-note>
            </ion-item>
            
            <ion-item>
              <div class="icon-container medium" slot="start">
                <i class="fad fa-sword" style="--fa-primary-color: #a1a1a1; --fa-secondary-color: #666"></i>
              </div>
              <ion-label>Medium Monsters</ion-label>
              <ion-note slot="end">{{ temple.mediumMonsters || getDefaultMonsterCount('medium') }}</ion-note>
            </ion-item>
            
            <ion-item>
              <div class="icon-container large" slot="start">
                <i class="fad fa-shield" style="--fa-primary-color: #cd7f32; --fa-secondary-color: #8b4513"></i>
              </div>
              <ion-label>Large Monsters</ion-label>
              <ion-note slot="end">{{ temple.largeMonsters || getDefaultMonsterCount('large') }}</ion-note>
            </ion-item>
            
            <ion-item>
              <div class="icon-container miniboss" slot="start">
                <i class="fad fa-helmet-battle" style="--fa-primary-color: silver; --fa-secondary-color: #666"></i>
              </div>
              <ion-label>Minibosses</ion-label>
              <ion-note slot="end">{{ temple.minibosses || getDefaultMonsterCount('miniboss') }}</ion-note>
            </ion-item>
            
            <ion-item>
              <div class="icon-container boss" slot="start">
                <i class="fad fa-crown" style="--fa-primary-color: gold; --fa-secondary-color: #c17e03"></i>
              </div>
              <ion-label>Boss</ion-label>
              <ion-note slot="end">{{ temple.bosses || getDefaultMonsterCount('boss') }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label>Temple Customization</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="stacked">Custom Name</ion-label>
          <ion-input v-model="temple.customName" placeholder="Enter a custom name for this temple"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">Custom Description</ion-label>
          <ion-textarea
            v-model="temple.customDescription"
            placeholder="Enter a custom description for this temple"
            rows="3"
          ></ion-textarea>
        </ion-item>
      </ion-list>

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
      </ion-list>

      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label>Associated Categories</ion-label>
        </ion-list-header>
        
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

      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label>Temple Hierarchy</ion-label>
        </ion-list-header>

        <ion-item button detail="true" class="monster-item">
          <div class="icon-container boss" slot="start">
            <i class="fad fa-crown" style="--fa-primary-color: gold; --fa-secondary-color: #c17e03"></i>
          </div>
          <ion-label>
            <h2>Temple Boss</h2>
            <p>Main guardian of the temple</p>
          </ion-label>
          <ion-badge color="danger" slot="end">Lvl 50</ion-badge>
        </ion-item>

        <ion-item button detail="true" class="monster-item">
          <div class="icon-container miniboss" slot="start">
            <i class="fad fa-helmet-battle" style="--fa-primary-color: silver; --fa-secondary-color: #666"></i>
          </div>
          <ion-label>
            <h2>Temple Miniboss</h2>
            <p>Sub-bosses guarding special areas</p>
          </ion-label>
          <ion-badge color="warning" slot="end">Lvl 35-45</ion-badge>
        </ion-item>

        <ion-item button detail="true" class="monster-item">
          <div class="icon-container large" slot="start">
            <i class="fad fa-shield" style="--fa-primary-color: #cd7f32; --fa-secondary-color: #8b4513"></i>
          </div>
          <ion-label>
            <h2>Large Monsters</h2>
            <p>Powerful temple guardians</p>
          </ion-label>
          <ion-badge color="warning" slot="end">Lvl 25-35</ion-badge>
        </ion-item>

        <ion-item button detail="true" class="monster-item">
          <div class="icon-container medium" slot="start">
            <i class="fad fa-sword" style="--fa-primary-color: #a1a1a1; --fa-secondary-color: #666"></i>
          </div>
          <ion-label>
            <h2>Medium Monsters</h2>
            <p>Standard temple protectors</p>
          </ion-label>
          <ion-badge color="primary" slot="end">Lvl 15-25</ion-badge>
        </ion-item>

        <ion-item button detail="true" class="monster-item">
          <div class="icon-container small" slot="start">
            <i class="fad fa-ghost" style="--fa-primary-color: #8b8b8b; --fa-secondary-color: #666"></i>
          </div>
          <ion-label>
            <h2>Small Monsters</h2>
            <p>Common temple creatures</p>
          </ion-label>
          <ion-badge color="success" slot="end">Lvl 5-15</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from "vue";
import ionic from "@/mixins/ionic";
import { useRouter } from "vue-router";
import {
  AchievementCategoryInterface,
  AchievementCategoryDb,
  achievementCategoryStorage,
} from "@/databases/AchievementDb";
import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";
import { sortCategoryByName } from "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement";
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, 
  IonButton, IonContent, IonAvatar, IonIcon, IonGrid, IonRow, IonCol, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonList,
  IonListHeader, IonItem, IonLabel, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonBadge, IonProgressBar, IonCardContent, IonNote, IonChip
} from '@ionic/vue';
import { 
  gridOutline, saveOutline, cloudOutline, leafOutline, waterOutline,
  flameOutline, snowOutline, sunnyOutline, moonOutline, homeOutline,
  diamondOutline, shieldOutline, flashOutline, personOutline, starOutline
} from 'ionicons/icons';

const requireBg = require.context("@/assets/images/backgrounds/");

export default defineComponent({
  props: ["templeId"],
  name: "xp-temple-settings",
  components: {
    IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, 
    IonButton, IonContent, IonAvatar, IonIcon, IonGrid, IonRow, IonCol, 
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonList,
    IonListHeader, IonItem, IonLabel, IonInput, IonTextarea, IonSelect,
    IonSelectOption, IonBadge, IonProgressBar, IonCardContent, IonNote, IonChip
  },
  mixins: [ionic],

  setup(props) {
    const router = useRouter();
    const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
    const categories = ref([] as ExtendedCategoryInterface[]);
    const templeDb = new TempleDb(templeStorage);

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
      keyCount?: number;
      hasMap?: boolean;
      hasCompass?: boolean;
      hasBossKey?: boolean;
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

    const temple = ref<ExtendedTempleInterface>({
      id: props.templeId,
      categoryIds: [] as string[],
      memberCount: 20,
      level: 3,
      taskCount: 15,
      customName: "",
      customDescription: "",
    });

    const dungeonStats = ref({
      totalRooms: 0,
      visitedRooms: 0,
      totalTreasures: 0,
      foundTreasures: 0
    });

    const calculateDungeonStats = () => {
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
          Object.entries(layout.rooms).forEach(([key, roomData]) => {
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

    // Watch for temple changes and autosave
    watch(temple, (newVal) => {
      templeDb.setTemple({...newVal, id: props.templeId});
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
      } catch (e) {
        // Try fallbacks in order if the specific world image doesn't exist
        try {
          const img = requireBg('./world-map.jpg');
          return `url(${img})`;
        } catch (e2) {
          try {
            const img = requireBg('./hometown.jpg');
            return `url(${img})`;
          } catch (e3) {
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
      const members = temple.value.memberCount || 0;
      const tasks = temple.value.taskCount || 0;
      
      // Formula: level * 10 + members * 0.5 + tasks * 0.2
      const rating = Math.min(100, Math.round(level * 10 + members * 0.5 + tasks * 0.2));
      return rating;
    };

    const getProgressColor = (value, max) => {
      const percentage = (value / max) * 100;
      if (percentage >= 75) return 'success';
      if (percentage >= 50) return 'warning';
      return 'danger';
    };

    const calculateTotalMonsters = () => {
      return (temple.value.smallMonsters || getDefaultMonsterCount('small')) +
             (temple.value.mediumMonsters || getDefaultMonsterCount('medium')) +
             (temple.value.largeMonsters || getDefaultMonsterCount('large')) +
             (temple.value.minibosses || getDefaultMonsterCount('miniboss')) +
             (temple.value.bosses || getDefaultMonsterCount('boss'));
    };

    const getDefaultMonsterCount = (type) => {
      const defaultCounts = {
        small: 12,
        medium: 8,
        large: 4,
        miniboss: 2,
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
      categories,
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
      calculateTotalMonsters,
      getDefaultMonsterCount,
      getCategoryColor,
      getCategoryIcon,
      getCategoryName,
      dungeonStats,
      calculateDungeonStats,
      // Ionic icons
      gridOutline,
      saveOutline,
      diamondOutline,
      shieldOutline,
      flashOutline, 
      personOutline,
      starOutline
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
    
    // Card stats styling
    ion-grid {
      ion-card {
        margin: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        overflow: hidden;
        
        ion-card-header {
          padding: 1rem;
          text-align: center;
          
          ion-card-subtitle {
            text-transform: uppercase;
            font-size: 0.8rem;
            font-weight: 600;
            opacity: 0.7;
          }
          
          ion-card-title {
            font-size: 1.8rem;
            font-weight: bold;
            color: var(--ion-color-primary);
          }
        }
      }
    }
    
    // List styling
    ion-list {
      background: transparent;
      padding: 0;
      margin-bottom: 1rem;
      
      ion-list-header {
        background: transparent;
        
        ion-label {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--ion-color-dark);
          padding-left: 0.5rem;
          border-left: 4px solid var(--ion-color-primary);
        }
      }
      
      ion-item {
        --background: white;
        --border-radius: 8px;
        margin-bottom: 0.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        
        &:last-child {
          margin-bottom: 0;
        }
        
        ion-label {
          h2 {
            font-weight: 600;
            font-size: 1rem;
          }
          
          p {
            font-size: 0.8rem;
            opacity: 0.7;
          }
        }
        
        ion-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--ion-color-primary-rgb), 0.1);
          
          ion-icon {
            font-size: 1.5rem;
          }
        }
      }
    }
    
    // Monster hierarchy styling
    .monster-item {
      .icon-container {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        
        i {
          font-size: 24px;
        }
        
        &.boss {
          background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,215,0,0.1) 100%);
          border: 2px solid gold;
        }
        
        &.miniboss {
          background: radial-gradient(circle, rgba(192,192,192,0.3) 0%, rgba(192,192,192,0.1) 100%);
          border: 2px solid silver;
        }
        
        &.large {
          background: radial-gradient(circle, rgba(205,127,50,0.3) 0%, rgba(205,127,50,0.1) 100%);
          border: 2px solid #cd7f32;
        }
        
        &.medium {
          background: radial-gradient(circle, rgba(161,161,161,0.3) 0%, rgba(161,161,161,0.1) 100%);
          border: 2px solid #a1a1a1;
        }
        
        &.small {
          background: radial-gradient(circle, rgba(139,139,139,0.3) 0%, rgba(139,139,139,0.1) 100%);
          border: 2px solid #8b8b8b;
        }
      }
    }
    
    // New card styles
    .power-card {
      .rating-stars {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 10px 0;
        
        i {
          font-size: 24px;
          color: var(--ion-color-warning);
        }
      }
      
      p {
        text-align: center;
        font-size: 0.9rem;
        opacity: 0.7;
      }
    }
    
    .exploration-card {
      ion-progress-bar {
        margin: 5px 0;
        height: 6px;
        --buffer-background: rgba(0,0,0,0.1);
        border-radius: 3px;
      }
      
      .special-items {
        display: flex;
        gap: 12px;
        
        .special-item {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
          
          &.active {
            background: rgba(var(--ion-color-success-rgb), 0.2);
            box-shadow: 0 0 8px var(--ion-color-success);
          }
          
          i {
            font-size: 16px;
          }
        }
      }
    }
    
    .monster-population-card {
      ion-note {
        font-size: 1rem;
        font-weight: bold;
      }
    }
    
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
    
    // Responsive adjustments for smaller screens
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
      
      ion-grid ion-card ion-card-header ion-card-title {
        font-size: 1.5rem;
      }
    }
  }
</style>
