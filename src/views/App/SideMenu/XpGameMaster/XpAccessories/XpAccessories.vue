<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <i
          slot="start"
          class="fad fa-hand-holding-usd fa-2x"
        />
        <ion-title>
          Shops & Accessories
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openSettings">
            <i class="fad fa-cog fa-2x" />
          </ion-button>
          <ion-button @click="toggleFilter">
            <ion-icon :icon="filterIcon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="showFilter">
        <ion-segment v-model="filterType">
          <ion-segment-button value="all">All</ion-segment-button>
          <ion-segment-button value="real">Real Life</ion-segment-button>
          <ion-segment-button value="virtual">In-Game</ion-segment-button>
        </ion-segment>
        <ion-buttons slot="end">

          <ion-button @click="toggleSort">
            <ion-icon :icon="sortIcon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="showSort">
        <ion-segment v-model="sortType">
          <ion-segment-button value="name">Name</ion-segment-button>
          <ion-segment-button value="price">Price</ion-segment-button>
          <ion-segment-button value="rarity">Rarity</ion-segment-button>
        </ion-segment>
        <ion-buttons slot="end">
          <ion-button @click="toggleSortDirection">
            <ion-icon :icon="sortDirection === 'asc' ? arrowUp : arrowDown" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <ion-list>
        <ion-item
          v-for="accessory in filteredAccessories"
          :key="accessory.id"
          button
          @click="clickAccessory(accessory)"
        >
          <ion-label>
            {{ accessory.name }}
            <p>
              <ion-badge :color="getTypeColor(accessory.type)">{{ accessory.type || 'Unknown' }}</ion-badge>
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
      <ion-fab
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button @click="presentActionSheet" color="rpg">
          <i class="fad fa-hand-holding-usd fa-2x"/>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
  import { defineComponent, ref, computed } from 'vue'
  import ionic from '@/mixins/ionic'
  import { loadingController, actionSheetController } from '@ionic/vue'

  import {
    addSharp,
    thumbsUpOutline,
    thumbsUpSharp,
    searchSharp,
    searchOutline,
    filterOutline,
    arrowUp,
    arrowDown,
    add,
    createOutline,
    cloudDownloadOutline
  } from 'ionicons/icons'

  import { useRouter } from 'vue-router'

  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity } from '@/databases/AccessoriesDb';

  export default defineComponent({
    name: 'xp-accessories',
    mixins: [ionic],
    data() {
      return {
        // data properties go here
      }
    },
    methods: {
      openSettings() {
        this.$router.push({
          name: 'xp-settings-reward'
        })
      },
      async clickDiscover() {
        // Use the directly imported loadingController
        loadingController.create({
          message: 'Discovering accessories...',
          duration: 1500
        }).then(loading => {
          loading.present();
          
          // After loading finishes, navigate to discover page
          setTimeout(() => {
            this.$router.push({
              name: 'xp-discover-accessories'
            });
          }, 1600);
        });
      },
      async loadAccessories() {
        const accessories = await this.accessoryDb.getAccessories();
        this.accessories = accessories
      },
      clickAccessory(accessory: Accessory) {
        this.$router.push({
          name: 'xp-create-update-accessory',
          params: {
            id: accessory.id
          }
        })
      },
      getTypeColor(type: string) {
        // Handle case where type is undefined by providing a default color
        if (!type) return 'medium';
        return type.toLowerCase() === 'real' ? 'success' : 'tertiary';
      },
      getRarityLabel(rarity: Rarity) {
        const rarityMap = {
          [Rarity.Common]: 'Common',
          [Rarity.Uncommon]: 'Uncommon',
          [Rarity.Rare]: 'Rare',
          [Rarity.Epic]: 'Epic',
          [Rarity.Legendary]: 'Legendary'
        };
        return rarityMap[rarity] || 'Unknown';
      }
    },
    mounted() {
      this.loadAccessories()
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

      const toggleFilter = () => {
        showFilter.value = !showFilter.value;
      };

      const toggleSort = () => {
        showSort.value = !showSort.value;
      };

      const toggleSortDirection = () => {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      };

      const clickAdd = () => {
        router.push({
          name: 'xp-create-update-accessory'
        })
      }

      return {
        clickAdd,
        accessories,
        accessoryDb,
        add,
        searchSharp,
        searchOutline,
        thumbsUpOutline,
        thumbsUpSharp,
        addSharp,
        filterIcon: filterOutline,
        showFilter,
        filterType,
        filteredAccessories,
        toggleFilter,
        showSort,
        sortType,
        sortDirection,
        toggleSort,
        toggleSortDirection,
        sortIcon: filterOutline,
        arrowUp,
        arrowDown,
        presentActionSheet: async () => {
          const actionSheet = await actionSheetController.create({
            header: 'Accessory Actions',
            cssClass: 'accessories-action-sheet',
            mode: 'ios',
            buttons: [
              {
                text: 'Create New Accessory',
                icon: createOutline,
                cssClass: 'action-create',
                handler: () => {
                  clickAdd();
                }
              },
              {
                text: 'Discover Accessories',
                icon: searchOutline,
                cssClass: 'action-discover',
                handler: () => {
                  router.push({
                    name: 'xp-discover-accessories'
                  });
                }
              },
              {
                text: 'Import Accessories',
                icon: cloudDownloadOutline,
                cssClass: 'action-import',
                handler: () => {
                  // Import functionality would go here
                  // This is a placeholder for future implementation
                }
              },
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'action-cancel'
              }
            ],
          });
          await actionSheet.present();
        }
      }
    }
  })
</script>
<style lang="scss" scoped>
.xp-accessories {
  ion-fab-list {
    ion-fab-button {
      &::before {
        position: absolute;
        right: 53px;
        top: 12px;
        cursor: pointer;
      }

      &:nth-child(1)::before {
        content: "Create your Own ";
      }

      &:nth-child(2)::before {
        content: "Add from Discover";
      }

      &:nth-child(3)::before {
        content: "Add from Recommended";
      }
    }
  }

  ion-badge {
    margin-right: 5px;
  }

  ion-segment {
    padding: 5px;
  }
}
</style>