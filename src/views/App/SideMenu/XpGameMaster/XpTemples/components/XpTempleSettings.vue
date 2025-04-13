<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar :style="{ '--background': getTempleColor() }">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>Temple Settings</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <i class="fas fa-cog" />
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="saveTemple">
            <i class="fas fa-save" />
            Save
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :style="{ '--background': `${getTempleBg()} no-repeat center/cover` }">
      <div class="content-overlay">
        <div class="temple-info">
          <div class="temple-title">
            <i :class="getTempleIcon()" class="temple-icon" />
            <h1>{{ getDisplayName() }}</h1>
          </div>
          <p class="temple-description">{{ getDisplayDescription() }}</p>
        </div>

        <div class="temple-stats">
          <ion-card>
            <div class="stat-value">{{ temple.memberCount || 0 }}</div>
            <div class="stat-label">Members</div>
          </ion-card>
          <ion-card>
            <div class="stat-value">{{ temple.level || 1 }}</div>
            <div class="stat-label">Level</div>
          </ion-card>
          <ion-card>
            <div class="stat-value">{{ temple.taskCount || 0 }}</div>
            <div class="stat-label">Tasks</div>
          </ion-card>
        </div>

        <div class="customization-section">
          <div class="section-title">Temple Customization</div>
          <ion-item>
            <ion-label position="stacked">Custom Name (e.g. "Kitchen")</ion-label>
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
        </div>

        <div class="categories-section">
          <div class="section-title">Categories</div>
          <ion-item>
            <ion-label position="stacked">Related Categories</ion-label>
            <ion-select
              v-model="temple.categoryIds"
              placeholder="Choose relating categories..."
              mode="ios"
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
        </div>

        <div class="enemy-hierarchy">
          <div class="section-title">Temple Hierarchy</div>

          <ion-card class="enemy-card">
            <ion-item button>
              <i
                class="fad fa-crown enemy-icon"
                style="--fa-primary-color: gold; --fa-secondary-color: #c17e03"
              />
              <div class="enemy-info">
                <h3>Temple Guardian</h3>
                <p>Main boss of the temple</p>
              </div>
              <ion-badge color="danger" slot="end">Lvl 50</ion-badge>
            </ion-item>
          </ion-card>

          <ion-card class="enemy-card">
            <ion-item button>
              <i
                class="fad fa-helmet-battle enemy-icon"
                style="--fa-primary-color: silver; --fa-secondary-color: #666"
              />
              <div class="enemy-info">
                <h3>Temple Wardens</h3>
                <p>Sub-bosses and elite guards</p>
              </div>
              <ion-badge color="warning" slot="end">Lvl 30-40</ion-badge>
            </ion-item>
          </ion-card>

          <ion-card class="enemy-card">
            <ion-item button>
              <i
                class="fad fa-shield enemy-icon"
                style="--fa-primary-color: #cd7f32; --fa-secondary-color: #8b4513"
              />
              <div class="enemy-info">
                <h3>Temple Sentinels</h3>
                <p>Powerful temple defenders</p>
              </div>
              <ion-badge color="warning" slot="end">Lvl 20-30</ion-badge>
            </ion-item>
          </ion-card>

          <ion-card class="enemy-card">
            <ion-item button>
              <i
                class="fad fa-sword enemy-icon"
                style="--fa-primary-color: #a1a1a1; --fa-secondary-color: #666"
              />
              <div class="enemy-info">
                <h3>Temple Guards</h3>
                <p>Regular temple protectors</p>
              </div>
              <ion-badge color="primary" slot="end">Lvl 10-20</ion-badge>
            </ion-item>
          </ion-card>

          <ion-card class="enemy-card">
            <ion-item button>
              <i
                class="fad fa-hood-cloak enemy-icon"
                style="--fa-primary-color: #8b8b8b; --fa-secondary-color: #666"
              />
              <div class="enemy-info">
                <h3>Temple Initiates</h3>
                <p>Novice temple members</p>
              </div>
              <ion-badge color="success" slot="end">Lvl 1-10</ion-badge>
            </ion-item>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, watch } from "vue";
  import ionic from "@/mixins/ionic";
  import {
    AchievementCategoryInterface,
    AchievementCategoryDb,
    achievementCategoryStorage,
  } from "@/databases/AchievementDb";
  import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";
  import { sortCategoryByName } from "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement";

  const requireBg = require.context("@/assets/images/backgrounds/");

  export default defineComponent({
    props: ["templeId"],
    name: "xp-temple-settings",
    mixins: [ionic],

    mounted() {
      this.loadCategories();
      this.loadTempleData();
    },

    setup(props) {
      const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
      const categories = ref([] as AchievementCategoryInterface[]);
      const templeDb = new TempleDb(templeStorage);

      const loadCategories = async () => {
        categories.value = await categoryDb.getAll();
        categories.value = categories.value.sort(sortCategoryByName);
      };

      const temple = ref({
        id: props.templeId,
        categoryIds: [] as string[],
        memberCount: 20,
        level: 3,
        taskCount: 15,
        customName: "",
        customDescription: "",
      });

      // Watch for temple changes and autosave
      watch(temple, (newVal) => {
        templeDb.setTemple({...newVal, id: props.templeId});
      }, { deep: true });

      const getTempleIcon = () => {
        const icons = {
          "wind-temple": "fad fa-wind",
          "earth-temple": "fad fa-mountain",
          "water-temple": "fad fa-water",
          "fire-fortress": "fad fa-fire",
          "frozen-fortress": "fad fa-snowflake",
          "sun-temple": "fad fa-sun",
          "moon-temple": "fad fa-moon",
        };
        return icons[props.templeId] || "fad fa-place-of-worship";
      };

      const getTempleName = () => {
        const names = {
          "wind-temple": "Temple of Zephyr",
          "earth-temple": "Gaia Sanctuary",
          "water-temple": "Aqua Haven",
          "fire-fortress": "Inferno Citadel",
          "frozen-fortress": "Frost Keep",
          "sun-temple": "Solar Sanctum",
          "moon-temple": "Lunar Shrine",
        };
        return names[props.templeId] || props.templeId;
      };

      const getTempleDescription = () => {
        const descriptions = {
          "wind-temple": "Masters of aerial magic and swift techniques",
          "earth-temple": "Guardians of nature and earthen powers",
          "water-temple": "Wielders of healing and fluid combat",
          "fire-fortress": "Home to powerful offensive spells",
          "frozen-fortress": "Specialists in ice magic and defense",
          "sun-temple": "Light magic and restoration abilities",
          "moon-temple": "Dark magic and mysterious arts",
        };
        return descriptions[props.templeId] || "";
      };

      const getTempleColor = () => {
        const colors = {
          "wind-temple": "#90caf9",
          "earth-temple": "#795548",
          "water-temple": "#2196f3",
          "fire-fortress": "#f44336",
          "frozen-fortress": "#42a5f5",
          "sun-temple": "#ffd700",
          "moon-temple": "#673ab7",
        };
        return colors[props.templeId] || "#9e9e9e";
      };

      const getTempleBg = () => {
        const worlds = {
          "wind-temple": "plains",
          "earth-temple": "forest",
          "water-temple": "islands",
          "fire-fortress": "mountains",
          "frozen-fortress": "ice",
          "sun-temple": "desert",
          "moon-temple": "moon",
        };
        const world = worlds[props.templeId] || "plains";
        try {
          const img = requireBg(`./world-${world}.jpg`);
          return `url(${img})`;
        } catch {
          return "none";
        }
      };

      const getDisplayName = () => {
        return temple.value.customName || getTempleName();
      };

      const getDisplayDescription = () => {
        return temple.value.customDescription || getTempleDescription();
      };

      return {
        temple,
        categories,
        loadCategories,
        getTempleIcon,
        getTempleName,
        getTempleDescription,
        getTempleColor,
        getTempleBg,
        getDisplayName,
        getDisplayDescription,
      };
    },

    methods: {
      async loadTempleData() {
        await this.loadCategories();
        if (this.templeId) {
          await this.loadTemple(this.templeId);
        }
      },
      
      async loadTemple(id) {
        const templeDb = new TempleDb(templeStorage);
        const templeData = await templeDb.getTempleById(id);
        
        if (templeData) {
          // Merge the loaded data with the default template
          this.temple = {
            ...this.temple,
            ...templeData
          };
        } else {
          // Initialize with default values and save
          this.saveTemple();
        }
      },
      
      async saveTemple() {
        const templeDb = new TempleDb(templeStorage);
        const templeToSave = {
          ...this.temple,
          id: this.templeId
        };
        await templeDb.setTemple(templeToSave);
      }
    },
  });
</script>

<style lang="scss" scoped>
  .xp-temple-settings {
    ion-content::part(background) {
      opacity: 1;
    }

    .content-overlay {
      min-height: 100%;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%);
      padding-bottom: 2rem;
    }

    .temple-info {
      position: relative;
      color: white;
      padding: 1rem;

      .temple-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;

        .temple-icon {
          font-size: 2rem;
        }

        h1 {
          margin: 0;
          font-size: 1.5rem;
        }
      }

      .temple-description {
        opacity: 0.9;
        font-size: 0.9rem;
      }
    }

    .temple-stats {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      flex-wrap: wrap;

      ion-card {
        margin: 0;
        flex: 1;
        min-width: 120px;
        text-align: center;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.9);

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.7;
          text-transform: uppercase;
        }
      }
    }

    .enemy-hierarchy, .categories-section, .customization-section {
      padding: 1rem;

      .section-title {
        font-size: 1.2rem;
        margin: 1rem 0;
        padding-left: 1rem;
        border-left: 4px solid var(--ion-color-primary);
        color: white;
      }

      ion-card, ion-item {
        background: rgba(255, 255, 255, 0.9);
        margin-bottom: 1rem;
        border-radius: 12px;
        overflow: hidden;
      }

      .enemy-card {
        ion-item {
          --background: transparent;
          margin-bottom: 0;

          .enemy-icon {
            font-size: 1.5rem;
            margin-right: 1rem;
          }

          .enemy-info {
            h3 {
              margin: 0;
              font-size: 1rem;
            }

            p {
              margin: 0.25rem 0 0;
              font-size: 0.8rem;
              opacity: 0.7;
            }
          }

          ion-badge {
            margin-left: auto;
          }
        }
      }
    }
  }
</style>
