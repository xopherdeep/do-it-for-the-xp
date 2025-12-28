<template>
  <div class="xp-economy-items transparent-content">
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
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent, ref, computed, onMounted } from 'vue'
  import {
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
    arrowUp,
    arrowDown,
  } from 'ionicons/icons'
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import { useRouter } from 'vue-router'
  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity } from '@/lib/databases/AccessoriesDb';
  import XpGp from "@/components/atoms/Currency/XpGp.vue";

  export default defineComponent({
    name: 'XpEconomyItems',
    components: {
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
      IonBadge
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

      onMounted(() => {
        loadAccessories();
      });

      const filteredAccessories = computed(() => {
        let filtered = accessories.value;
        if (filterType.value !== 'all') {
          filtered = filtered.filter(item => {
            const isRealLife = item.type?.toLowerCase() === 'real';
            return (filterType.value === 'real' && isRealLife) ||
              (filterType.value === 'virtual' && !isRealLife);
          });
        }
        return filtered.sort((a, b) => {
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
        sortIcon: filterOutline, // reusing filter icon for sort as placeholder or find sort icon
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
</style>
