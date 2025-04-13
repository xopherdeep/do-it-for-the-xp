<style lang="scss" scoped>
  .xp-temples {
    ion-card {
      background-size: cover !important;
      background-position: center !important;
      margin: 1rem;
      border-radius: 12px;
      overflow: hidden;
    }

    .temple-content {
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.8),
        rgba(0, 0, 0, 0.5)
      );
      padding: 1rem;
      color: white;
    }

    .temple-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;

      .temple-icon {
        margin-right: 0.5rem;
        font-size: 1.5rem;

        &.fa-wind {
          --fa-primary-color: #e3f2fd;
          --fa-secondary-color: #90caf9;
        }

        &.fa-mountain {
          --fa-primary-color: #795548;
          --fa-secondary-color: #4e342e;
        }

        &.fa-water {
          --fa-primary-color: #bbdefb;
          --fa-secondary-color: #2196f3;
        }

        &.fa-fire {
          --fa-primary-color: #ffcdd2;
          --fa-secondary-color: #f44336;
        }

        &.fa-snowflake {
          --fa-primary-color: #e3f2fd;
          --fa-secondary-color: #42a5f5;
        }

        &.fa-sun {
          --fa-primary-color: #fff176;
          --fa-secondary-color: #ffd700;
        }

        &.fa-moon {
          --fa-primary-color: #b39ddb;
          --fa-secondary-color: #673ab7;
        }

        &.fa-place-of-worship {
          --fa-primary-color: #e0e0e0;
          --fa-secondary-color: #9e9e9e;
        }
      }
    }

    .temple-description {
      font-size: 0.9rem;
      opacity: 0.9;
      margin: 0.5rem 0;
    }

    .temple-stats {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
  }
</style>

<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-place-of-worship fa-lg" />
          Temples
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-grid>
        <ion-row>
          <ion-col
            size="12"
            size-md="6"
            v-for="temple in temples"
            :key="temple.id"
          >
            <ion-card
              :style="{
                background: `${getBgUrl(temple.world)}`,
              }"
              @click="clickTemple(temple.id)"
              button
            >
              <div class="temple-content">
                <div class="temple-header">
                  <i :class="getTempleIcon(temple.id)" class="temple-icon" />
                  <h2>{{ getTempleName(temple.id) }}</h2>
                </div>
                <div class="temple-description">
                  {{ getTempleDescription(temple.id) }}
                </div>
                <div class="temple-stats">
                  <ion-badge color="danger">
                    <i class="fas fa-users" /> 20 Members
                  </ion-badge>
                  <ion-badge color="warning">
                    <i class="fas fa-star" /> Level {{ temple.level || 1 }}
                  </ion-badge>
                </div>
              </div>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import ionic from "@/mixins/ionic";
  import { useRouter } from "vue-router";
  import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";

  const requireBg = require.context("@/assets/images/backgrounds/");

  export default defineComponent({
    name: "xp-temples",
    mixins: [ionic],
    setup() {
      const $router = useRouter();
      const templeDb = new TempleDb(templeStorage);
      const templeData = ref({} as Record<string, TempleInterface>);

      // Default temple configuration
      const temples = ref([
        {
          id: "wind-temple",
          world: "plains",
          level: 3,
        },
        {
          id: "earth-temple",
          world: "forest",
          level: 2,
        },
        {
          id: "water-temple",
          world: "islands",
          level: 4,
        },
        {
          id: "fire-fortress",
          world: "mountains",
          level: 5,
        },
        {
          id: "frozen-fortress",
          world: "ice",
          level: 2,
        },
        {
          id: "sun-temple",
          world: "desert",
          level: 3,
        },
        {
          id: "moon-temple",
          world: "moon",
          level: 1,
        },
      ]);

      // Load temple data from storage
      const loadTempleData = async () => {
        for (const temple of temples.value) {
          const data = await templeDb.getTempleById(temple.id);
          if (data) {
            templeData.value[temple.id] = data;
          }
        }
      };

      // Load temple data when component is mounted
      onMounted(() => {
        loadTempleData();
      });

      const getBgUrl = (world: string) => {
        const img = requireBg(`./world-${world}.jpg`);
        return `url(${img})`;
      };

      const getTempleIcon = (templeId: string) => {
        const icons = {
          "wind-temple": "fad fa-wind",
          "earth-temple": "fad fa-mountain",
          "water-temple": "fad fa-water",
          "fire-fortress": "fad fa-fire",
          "frozen-fortress": "fad fa-snowflake",
          "sun-temple": "fad fa-sun",
          "moon-temple": "fad fa-moon",
        };
        return icons[templeId] || "fad fa-place-of-worship";
      };

      const getTempleName = (templeId: string) => {
        // First check if there's a custom name in the temple data
        if (templeData.value[templeId]?.customName) {
          return templeData.value[templeId].customName;
        }

        // Fall back to default names
        const names = {
          "wind-temple": "Temple of Zephyr",
          "earth-temple": "Gaia Sanctuary",
          "water-temple": "Aqua Haven",
          "fire-fortress": "Inferno Citadel",
          "frozen-fortress": "Frost Keep",
          "sun-temple": "Solar Sanctum",
          "moon-temple": "Lunar Shrine",
        };
        return names[templeId] || templeId;
      };

      const getTempleDescription = (templeId: string) => {
        // First check if there's a custom description in the temple data
        if (templeData.value[templeId]?.customDescription) {
          return templeData.value[templeId].customDescription;
        }

        // Fall back to default descriptions
        const descriptions = {
          "wind-temple": "Masters of aerial magic and swift techniques",
          "earth-temple": "Guardians of nature and earthen powers",
          "water-temple": "Wielders of healing and fluid combat",
          "fire-fortress": "Home to powerful offensive spells",
          "frozen-fortress": "Specialists in ice magic and defense",
          "sun-temple": "Light magic and restoration abilities",
          "moon-temple": "Dark magic and mysterious arts",
        };
        return descriptions[templeId] || "";
      };

      const clickTemple = (templeId: string) => {
        $router.push({
          name: "xp-temple-settings",
          params: {
            templeId,
          },
        });
      };

      return {
        getBgUrl,
        clickTemple,
        getTempleIcon,
        getTempleName,
        getTempleDescription,
        temples,
      };
    },
  });
</script>
