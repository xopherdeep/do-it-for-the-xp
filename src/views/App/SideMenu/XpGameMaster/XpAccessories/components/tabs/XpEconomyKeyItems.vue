<template>
    <ion-page class="xp-economy-key-items">
        <ion-content
            class="transparent-content"
            :fullscreen="true"
        >
            <div class="p-4">
                <ion-searchbar
                    v-model="searchQuery"
                    placeholder="Search Key Items..."
                    animated
                    class="mb-2"
                ></ion-searchbar>

                <div
                    v-for="(categoryItems, category) in groupedItems"
                    :key="category"
                    class="mb-6"
                >
                    <h3 class="text-xl font-bold ml-2 mb-2 capitalize text-white opacity-90">{{ category }} Items</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div
                            v-for="item in categoryItems"
                            :key="item.id"
                            class="key-item-card p-3 flex items-start rounded-lg bg-gray-800 bg-opacity-60 border border-gray-700"
                        >
                            <div
                                class="item-icon-wrapper p-3 rounded-lg mr-3 flex-shrink-0"
                                :class="`type-${category}`"
                            >
                                <i :class="`fad fa-${item.icon} fa-2x`"></i>
                            </div>
                            <div class="flex-grow">
                                <div class="font-bold text-lg text-white">{{ item.name }}</div>
                                <div class="text-sm text-gray-300 mb-1 leading-snug">{{ item.description }}</div>

                                <div class="mt-2 text-xs flex flex-wrap gap-1">
                                    <span class="px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                                        <i class="fas fa-lock-open mr-1"></i> {{ item.unlockEvent }}
                                    </span>
                                </div>
                            </div>
                            <!-- Assign Button -->
                            <ion-button
                                fill="clear"
                                size="small"
                                color="light"
                                @click.stop="assignItem(item)"
                                class="assign-btn"
                            >
                                <i class="fas fa-store mr-2"></i> Assign
                            </ion-button>
                        </div>
                    </div>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { alertController, toastController, IonPage, IonContent, IonSearchbar, IonButton } from "@ionic/vue";
import { getAllItems } from "@/lib/engine/core/items/itemRegistry";
import { ItemMetadata } from "@/lib/engine/core/items/itemTypes";
import shopsDb from "@/lib/databases/ShopsDb";

export default defineComponent({
  name: "XpEconomyKeyItems",
  components: {
    IonPage,
    IonContent,
    IonSearchbar,
    IonButton
  },
  setup() {
    const searchQuery = ref("");
    const allItems = getAllItems();

    const filteredItems = computed(() => {
        if (!searchQuery.value) return allItems;
        const lower = searchQuery.value.toLowerCase();
        return allItems.filter(i => i.name.toLowerCase().includes(lower) || i.description.toLowerCase().includes(lower));
    });

    const groupedItems = computed(() => {
        const groups: Record<string, ItemMetadata[]> = {};
        
        // Define order
        const categories = ['narrative', 'pegasus', 'dungeon', 'consumable'];
        
        categories.forEach(cat => {
            const items = filteredItems.value.filter(i => i.category === cat);
            if (items.length > 0) {
                groups[cat] = items;
            }
        });

        // Catch any others if category system changes
        filteredItems.value.forEach(item => {
            if (!categories.includes(item.category)) {
                if (!groups['other']) groups['other'] = [];
                groups['other'].push(item);
            }
        });

        return groups;
    });

    const assignItem = async (item: ItemMetadata) => {
        const shops = await shopsDb.getShops();
        
        if (shops.length === 0) {
            const toast = await toastController.create({
                message: 'No shops available. Create a shop first!',
                duration: 2000,
                color: 'warning'
            });
            await toast.present();
            return;
        }

        const alert = await alertController.create({
            header: `Assign ${item.name}`,
            subHeader: 'Select a shop to stock this item',
            inputs: shops.map(shop => ({
                type: 'radio',
                label: shop.name,
                value: shop.id
            })),
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Assign',
                    handler: async (shopId) => {
                        if (!shopId) return;
                        
                        // Get the shop and add the item
                        const shop = await shopsDb.getShopById(shopId);
                        if (shop) {
                            // Check if already assigned
                            if (shop.items.some(i => i.itemId === item.id)) {
                                 const toast = await toastController.create({
                                    message: `${item.name} is already in ${shop.name}!`,
                                    duration: 2000,
                                    color: 'warning'
                                });
                                await toast.present();
                                return;
                            }

                            shop.items.push({
                                itemId: item.id,
                                type: 1, // 0=Ability, 1=Accessory (Defaulting to Accessory logic for now)
                                price: item.gpCost || 0,
                                availableDays: []
                            });
                            await shopsDb.setShop(shop);
                            
                            const toast = await toastController.create({
                                message: `Assigned ${item.name} to ${shop.name}`,
                                duration: 2000,
                                color: 'success'
                            });
                            await toast.present();
                        }
                    }
                }
            ]
        });
        await alert.present();
    };

    return {
        searchQuery,
        groupedItems,
        assignItem
    };
  },
});
</script>

<style lang="scss" scoped>
    .key-item-card {
        transition: all 0.2s ease;
        position: relative;
        padding-right: 80px;
        /* Space for button */

        &:hover {
            background: rgba(50, 50, 60, 0.8);
            transform: translateY(-2px);
        }

        .assign-btn {
            position: absolute;
            top: 8px;
            right: 8px;
        }
    }

    .item-icon-wrapper {
        background: rgba(255, 255, 255, 0.05);

        &.type-narrative {
            color: var(--ion-color-tertiary);
        }

        &.type-pegasus {
            color: var(--ion-color-secondary);
        }

        &.type-dungeon {
            color: var(--ion-color-danger);
        }

        &.type-consumable {
            color: var(--ion-color-warning);
        }
    }
</style>
