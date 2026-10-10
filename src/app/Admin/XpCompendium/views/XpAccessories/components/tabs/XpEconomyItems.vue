<template>
  <ion-page class="xp-economy-items">
    <ion-content
      class="transparent-content"
      :fullscreen="true"
    >
      <div
        v-if="isLoading"
        class="loading-wrapper-centered"
      >
        <XpLoading />
      </div>
      <div v-else>
        <!-- Filter/Sort Toolbar (Inline) -->
        <ion-toolbar
          class="transparent-toolbar"
          style="--background: transparent; --min-height: 40px; padding: 0;"
        >
          <ion-buttons slot="end">
            <ion-button @click="toggleFilter">
              <ion-icon
                :icon="filterIcon"
                :color="showFilter ? 'primary' : 'medium'"
              />
            </ion-button>
            <ion-button @click="toggleSort">
              <ion-icon
                :icon="sortIcon"
                :color="showSort ? 'primary' : 'medium'"
              />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>

        <div
          v-if="showFilter"
          class="p-2"
        >
          <ion-segment
            v-model="filterType"
            mode="ios"
          >
            <ion-segment-button value="all">All</ion-segment-button>
            <ion-segment-button value="real">Real Life</ion-segment-button>
            <ion-segment-button value="virtual">In-Game</ion-segment-button>
          </ion-segment>
        </div>

        <div
          v-if="showSort"
          class="p-2"
        >
          <ion-segment
            v-model="sortType"
            mode="ios"
          >
            <ion-segment-button value="name">Name</ion-segment-button>
            <ion-segment-button value="price">Price</ion-segment-button>
            <ion-segment-button value="rarity">Rarity</ion-segment-button>
          </ion-segment>
          <ion-button
            fill="clear"
            size="small"
            @click="toggleSortDirection"
            class="w-full"
          >
            <ion-icon
              :icon="sortDirection === 'asc' ? arrowUp : arrowDown"
              slot="start"
            />
            {{ sortDirection === 'asc' ? 'Ascending' : 'Descending' }}
          </ion-button>
        </div>

        <ion-list
          class="transparent-list"
          style="background: transparent;"
        >
          <ion-item
            v-for="accessory in filteredAccessories"
            :key="accessory.id"
            button
            @click="clickAccessory(accessory)"
            class="item-card"
            style="--background: rgba(30, 30, 40, 0.6); margin-bottom: 8px; border-radius: 8px;"
            lines="none"
          >
            <ion-label>
              <h2>{{ accessory.name }}</h2>
              <p>
                <ion-badge
                  :color="getTypeColor(accessory.type)"
                  class="mr-2"
                >{{ accessory.type || 'Unknown' }}</ion-badge>
                <ion-badge
                  color="medium"
                  v-if="accessory.rarity"
                >{{ getRarityLabel(accessory.rarity) }}</ion-badge>
              </p>
            </ion-label>
            <xp-gp
              :gp="accessory.basePrice"
              slot="end"
            />
          </ion-item>
        </ion-list>

        <!-- Empty State -->
        <ion-card
          v-if="filteredAccessories.length === 0"
          class="empty-state max-w-[80%] mx-auto my-4 h-auto text-center"
        >
          <ion-card-title class="flex flex-row gap-2 items-center justify-center">
            <h2>{{ accessories.length === 0 ? "No Items Yet" : "No Items Match" }}</h2>
          </ion-card-title>
          <ion-card-content>
            <template v-if="accessories.length === 0">
              Items are what heroes buy in your shops with Gold: real-life rewards that cost the family money,
              like a meal out or a movie ticket, or in-game gear. Add a ready-made reward below, or make your own.
            </template>
            <template v-else>Try another filter.</template>
          </ion-card-content>
          <ion-button v-if="accessories.length === 0" color="rpg" @click="newAccessory">
            <i class="fad fa-plus-circle mr-1" />
            New Item
          </ion-button>
        </ion-card>

        <!-- Ready-made real-life rewards: money-valued treats are items bought with GP, never Powers -->
        <section
          v-if="presetsLeft.length"
          class="reward-presets"
          aria-label="Ready-made rewards"
        >
          <h2 class="reward-presets-title">Ready-made rewards</h2>
          <p class="reward-presets-hint">
            One tap adds a reward to your items. Stock it in a shop (Shops, pick a shop, Items) so heroes can buy it.
          </p>
          <ul class="reward-presets-list">
            <li
              v-for="preset in presetsLeft"
              :key="preset.id"
              class="reward-preset"
            >
              <i
                :class="['fad', `fa-${preset.icon}`, 'reward-preset-icon']"
                aria-hidden="true"
              />
              <div class="reward-preset-info">
                <strong>{{ preset.name }}</strong>
                <span>{{ preset.description }}</span>
              </div>
              <span class="reward-preset-price">{{ preset.basePrice }} GP</span>
              <ion-button
                size="small"
                color="rpg"
                :aria-label="`Add ${preset.name}`"
                @click="addRewardPreset(preset)"
              >
                Add
              </ion-button>
            </li>
          </ul>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from 'vue'
  import {
    onIonViewWillEnter,
    toastController,
    IonPage,
    IonContent,
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge
  } from '@ionic/vue'
  import {
    filterOutline,
    swapVerticalOutline,
    arrowUp,
    arrowDown,
  } from 'ionicons/icons'
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import { useRouter } from 'vue-router'
  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity } from '@/lib/databases/AccessoriesDb';
  import XpGp from "@/components/atoms/Currency/XpGp.vue";
  import { presetsNotIn, rewardFromPreset, RewardPreset } from "@/lib/services/shops/rewardPresets";
  import debug from "@/lib/utils/debug";
  import { play$fx } from "@/assets/fx";

  export default defineComponent({
    name: 'XpEconomyItems',
    components: {
      IonPage,
      IonContent,
      XpLoading,
      XpGp,
      IonToolbar,
      IonButtons,
      IonButton,
      IonIcon,
      IonSegment,
      IonSegmentButton,
      IonList,
      IonItem,
      IonLabel,
      IonBadge,
      IonCard,
      IonCardTitle,
      IonCardContent
    },

    setup() {
      const accessories = ref([] as Accessory[]);
      const router = useRouter();
      const accessoryDb = new AccessoriesDb(accessoriesStorage);
      const showFilter = ref(false);
      const filterType = ref('all');
      const showSort = ref(false);
      const sortType = ref('name');
      const sortDirection = ref('asc');
      const isLoading = ref(true);

      const loadAccessories = async () => {
        isLoading.value = true;
        try {
          const loaded = await accessoryDb.getAccessories();
          accessories.value = loaded;
        } finally {
          isLoading.value = false;
        }
      };

      // Reload on every visit, so an item made from the New Item screen is listed on return
      onIonViewWillEnter(loadAccessories);

      const filteredAccessories = computed(() => {
        let filtered = accessories.value;
        if (filterType.value !== 'all') {
          filtered = filtered.filter(item => {
            const isRealLife = item.type?.toLowerCase() === 'real';
            return (filterType.value === 'real' && isRealLife) ||
              (filterType.value === 'virtual' && !isRealLife);
          });
        }
        return [...filtered].sort((a, b) => {
          let comparison = 0;
          if (sortType.value === 'name') {
            comparison = a.name.localeCompare(b.name);
          } else if (sortType.value === 'price') {
            comparison = a.basePrice - b.basePrice;
          } else if (sortType.value === 'rarity') {
            comparison = a.rarity - b.rarity;
          }
          return sortDirection.value === 'asc' ? comparison : -comparison;
        });
      });

      const presetsLeft = computed(() => presetsNotIn(accessories.value));

      const addRewardPreset = async (preset: RewardPreset) => {
        try {
          await accessoryDb.setAccessory(rewardFromPreset(preset));
          await loadAccessories();
          play$fx("select");
          const toast = await toastController.create({
            message: `${preset.name} added. Stock it in a shop so heroes can buy it.`,
            duration: 2500,
            position: "top",
            cssClass: "rpg-toast",
          });
          await toast.present();
        } catch (error) {
          debug.error("Could not add the reward preset:", error);
        }
      };

      const newAccessory = () => {
        router.push({ name: 'xp-create-update-accessory' });
      };

      const clickAccessory = (accessory: Accessory) => {
        router.push({
          name: 'xp-create-update-accessory',
          params: {
            id: accessory.id
          }
        })
      };

      const toggleFilter = () => {
        showFilter.value = !showFilter.value;
        if (showFilter.value) showSort.value = false;
      };

      const toggleSort = () => {
        showSort.value = !showSort.value;
        if (showSort.value) showFilter.value = false;
      };

      const toggleSortDirection = () => {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      };

      const getTypeColor = (type: string) => {
        if (!type) return 'medium';
        return type.toLowerCase() === 'real' ? 'success' : 'tertiary';
      };

      const getRarityLabel = (rarity: Rarity) => {
        const rarityMap = {
          [Rarity.Common]: 'Common',
          [Rarity.Uncommon]: 'Uncommon',
          [Rarity.Rare]: 'Rare',
          [Rarity.Epic]: 'Epic',
          [Rarity.Legendary]: 'Legendary'
        };
        return rarityMap[rarity] || 'Unknown';
      };

      return {
        accessories,
        isLoading,
        filterIcon: filterOutline,
        sortIcon: swapVerticalOutline,
        showFilter,
        filterType,
        showSort,
        sortType,
        sortDirection,
        arrowUp,
        arrowDown,
        filteredAccessories,
        toggleFilter,
        toggleSort,
        toggleSortDirection,
        clickAccessory,
        newAccessory,
        presetsLeft,
        addRewardPreset,
        getTypeColor,
        getRarityLabel
      }
    }
  })
</script>
<style scoped>
  .loading-wrapper-centered {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
  }

  /* Ready-made rewards: an Earthbound window (palette written out; scoped styles have no theme variables) */
  .reward-presets {
    margin: 16px 12px 96px;
    padding: 12px;
    color: #e7e6b3;
    background: #280828;
    border: 3px solid #e7e6b3;
    border-radius: 6px;
    box-shadow: 0 0 0 3px #3d3c55;
  }

  .reward-presets-title {
    margin: 0 0 4px;
    font-family: "StatusPlz", monospace;
    font-size: 1.05rem;
    color: #f7e8a8;
    text-transform: uppercase;
  }

  .reward-presets-hint {
    margin: 0 0 10px;
    font-size: 0.8rem;
    opacity: 0.85;
  }

  .reward-presets-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .reward-preset {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px solid rgba(231, 230, 179, 0.2);
  }

  .reward-preset-icon {
    width: 28px;
    font-size: 1.4rem;
    text-align: center;
  }

  .reward-preset-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    font-size: 0.8rem;
  }

  .reward-preset-info strong {
    font-size: 0.95rem;
  }

  .reward-preset-price {
    font-family: "StatusPlz", monospace;
    color: #f7e8a8;
    white-space: nowrap;
  }
</style>
