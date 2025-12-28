<template>
  <ion-page class="xp-shop-items-tab">
    <ion-content class="ion-padding transparent-content" style="--background: transparent">
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>
      
      <ion-list v-else class="item-list">
        <!-- Empty State -->
        <ion-item v-if="shopItems.length === 0" lines="none" class="empty-state">
          <ion-label class="ion-text-center">
            <div class="empty-icon text-medium opacity-50 mb-4">
                <i class="fad fa-boxes fa-4x"></i>
            </div>
            <h2 class="text-lg font-bold">Shelves are Empty</h2>
            <p class="text-small text-medium">Click + to stock this shop with items.</p>
          </ion-label>
        </ion-item>

        <!-- Items List -->
        <ion-item-group v-for="(item, index) in shopItems" :key="item.itemId">
          <ion-item-sliding>
            <ion-item class="shop-item">
              <ion-thumbnail slot="start">
                <div class="item-icon-wrapper">
                    <i class="fad fa-sack-dollar fa-2x"></i>
                </div>
              </ion-thumbnail>
              
              <ion-label>
                <h2>{{ getItemName(item.itemId) }}</h2>
                <p>Price: {{ item.price || getItemPrice(item.itemId) }} GP</p>
                <div class="availability-badge">
                  <span v-if="!item.availableDays || item.availableDays.length === 0" class="text-success">
                    <i class="fas fa-check-circle"></i> Always Available
                  </span>
                  <span v-else class="text-warning">
                    <i class="fas fa-clock"></i> {{ item.availableDays.length }} Days/Week
                  </span>
                </div>
              </ion-label>

              <ion-button slot="end" fill="clear" @click="toggleEdit(index)">
                <i class="fas" :class="editingIndex === index ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </ion-button>
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option color="danger" @click="removeItem(index)">
                <i class="fas fa-trash"></i>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>

          <!-- Edit Configuration Panel -->
          <div v-if="editingIndex === index" class="item-config-panel">
            <!-- Price Override -->
             <div class="config-row">
              <div class="label">Override Price (GP)</div>
              <ion-input 
                type="number" 
                :value="item.price" 
                placeholder="Default"
                @ionInput="updatePrice(index, $event.target.value)"
                class="custom-input"
              ></ion-input>
            </div>

            <!-- Availability Selector -->
            <div class="config-row">
              <div class="label mb-2">Availability (Days Stocked)</div>
              <XpDaySelector 
                :modelValue="item.availableDays"
                @update:modelValue="updateAvailability(index, $event)"
              />
              <p class="text-tiny mt-2 text-medium">
                * Leave empty to make available every day.
              </p>
            </div>
          </div>
        </ion-item-group>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="rpg" @click="openItemPicker">
          <i class="fas fa-plus"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, inject, watch, Ref } from "vue";
import { onIonViewWillEnter, useIonRouter } from '@ionic/vue';
import Ionic from "@/mixins/ionic";
import shopsDb, { ShopInterface, ShopItem } from "@/lib/databases/ShopsDb";
import AccessoriesDb, { accessoriesStorage, Accessory } from "@/lib/databases/AccessoriesDb";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpDaySelector from "@/components/molecules/Inputs/XpDaySelector.vue";
import debug from "@/lib/utils/debug";
import { useItemSelectionStore } from "@/lib/store/stores/item-selection";
import { getItemMetadata } from "@/lib/engine/core/items/itemRegistry";

export default defineComponent({
  name: "XpShopItemsTab",
  mixins: [Ionic],
  components: {
    XpLoading,
    XpDaySelector
  },
  setup() {
    // Inject data from parent XpShopDetails
    const shop = inject<Ref<ShopInterface | null>>('shop');
    const isParentLoading = inject<Ref<boolean>>('isLoading');
    
    // Local state
    const shopItems = ref<ShopItem[]>([]);
    const allAccessories = ref<Accessory[]>([]); 
    const editingIndex = ref<number | null>(null);
    const accessoriesDb = new AccessoriesDb(accessoriesStorage);

    // Sync local items when parent shop loads
    watch(() => shop?.value, (newShop) => {
        if (newShop) {
            shopItems.value = newShop.items || [];
        }
    }, { immediate: true });

    const loadAccessories = async () => {
      try {
        allAccessories.value = await accessoriesDb.getAccessories();
      } catch (error) {
        debug.error("Error loading accessories cache", error);
      }
    };

    onIonViewWillEnter(() => {
        loadAccessories();
    });

    const getItemName = (itemId: string) => {
         // Try accessories DB first
        const acc = allAccessories.value.find(a => a.id === itemId);
        if (acc) return acc.name;
        
        // Fallback to Item Registry (Key Items)
        const keyItem = getItemMetadata(itemId);
        return keyItem ? keyItem.name : 'Unknown Item';
    };

    const getItemPrice = (itemId: string) => {
        const acc = allAccessories.value.find(a => a.id === itemId);
        if (acc) return acc.basePrice;
        
        const keyItem = getItemMetadata(itemId);
        return keyItem ? (keyItem.gpCost || 0) : 0;
    };

    const toggleEdit = (index: number) => {
        editingIndex.value = editingIndex.value === index ? null : index;
    };

    const saveShop = async () => {
        if (!shop?.value) return;
        shop.value.items = shopItems.value;
        await shopsDb.setShop(shop.value);
    };

    const updatePrice = async (index: number, price: any) => {
        const p = parseInt(price);
        if (isNaN(p)) {
            delete shopItems.value[index].price;
        } else {
            shopItems.value[index].price = p;
        }
        await saveShop();
    };

    const updateAvailability = async (index: number, days: number[]) => {
        shopItems.value[index].availableDays = days;
        await saveShop();
    };

    const removeItem = async (index: number) => {
        shopItems.value.splice(index, 1);
        await saveShop();
    };

    const itemSelectionStore = useItemSelectionStore();
    const router = useIonRouter();

    const openItemPicker = () => {
        const currentIds = shopItems.value.map(i => i.itemId);
        
        itemSelectionStore.startSelection(
            currentIds,
            'shop-items-tab',
            (selectedIds) => {
                const newIds = selectedIds.filter(id => !shopItems.value.some(i => i.itemId === id));
                const removedIds = shopItems.value.filter(i => !selectedIds.includes(i.itemId)).map(i => i.itemId);

                newIds.forEach(id => {
                    shopItems.value.push({
                        itemId: id,
                        type: 1, 
                        availableDays: [] 
                    });
                });
                
                shopItems.value = shopItems.value.filter(i => !removedIds.includes(i.itemId));
                saveShop();
            }
        );
        
        router.push({ name: 'xp-economy-global' });
    };

    return {
      isLoading: isParentLoading,
      shopItems,
      getItemName,
      getItemPrice,
      editingIndex,
      toggleEdit,
      updatePrice,
      updateAvailability,
      removeItem,
      openItemPicker
    };
  }
});
</script>

<style lang="scss" scoped>
.item-list {
  background: transparent;
  padding-bottom: 80px; // Space for FAB and Tab bar
}

.shop-item {
  --background: rgba(var(--ion-color-step-950-rgb, 10,10,10), 0.6);
  --border-color: rgba(255,255,255,0.05);
  margin-bottom: 8px;
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.item-icon-wrapper {
  background: rgba(255,255,255,0.05);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--eb-color-pale-yellow);
}

.availability-badge {
  margin-top: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  
  i { margin-right: 4px; }
}

.item-config-panel {
  background: rgba(0,0,0,0.4);
  padding: 16px;
  margin-bottom: 8px;
  margin-top: -8px;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  border-top: none;
  animation: slideDown 0.2s ease-out;
  backdrop-filter: blur(10px);
}

.config-row {
  margin-bottom: 12px;
  
  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--ion-color-medium);
    font-weight: 700;
    margin-bottom: 4px;
  }
}

.custom-input {
    --background: rgba(255,255,255,0.1);
    --padding-start: 12px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
}

.empty-state {
    --background: transparent;
    margin-top: 20vh;
}

.text-tiny { font-size: 0.7rem; }
.text-medium { color: var(--ion-color-medium); }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
