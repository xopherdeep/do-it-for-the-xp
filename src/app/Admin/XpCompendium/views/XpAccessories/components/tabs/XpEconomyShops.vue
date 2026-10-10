<template>
  <ion-page class="xp-economy-shops">
    <ion-content
      class="transparent-content"
      :fullscreen="true"
    >
      <div
        v-if="isLoading"
        class="flex justify-center items-center h-full"
      >
        <XpLoading />
      </div>
      <ion-grid v-else>
        <ion-row>
          <!-- Shops List -->
          <ion-col
            size="6"
            size-lg="4"
            size-xl="3"
            v-for="card in cards"
            :key="card.id"
          >
            <ion-card
              button
              @click="clickShop(card.id)"
              class="shop-card portrait-card"
            >
              <ion-img
                :src="card.image"
                class="shop-bg-image"
                alt="Shop background"
              ></ion-img>

              <div class="card-overlay">
                <span
                  class="open-badge"
                  :class="card.isOpen ? 'is-open' : 'is-closed'"
                >
                  <i
                    class="fad"
                    :class="card.isOpen ? 'fa-door-open' : 'fa-door-closed'"
                  ></i>
                  {{ card.isOpen ? "Open" : "Closed" }}
                </span>

                <div class="shop-icon-wrapper">
                  <i :class="card.icon + ' fa-3x'"></i>
                </div>
                <div class="shop-name">{{ card.name }}</div>

                <ul class="shop-facts">
                  <li>
                    <i class="fad fa-user-friends"></i>
                    <span>{{ card.clerk }}</span>
                  </li>
                  <li>
                    <i class="fad fa-boxes"></i>
                    <span>{{ card.itemCount }} {{ card.itemCount === 1 ? "item" : "items" }}</span>
                  </li>
                  <li>
                    <i class="fad fa-clock"></i>
                    <span>{{ card.hours }}</span>
                  </li>
                </ul>
              </div>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { computed, defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { IonPage, IonContent, IonGrid, IonRow, IonCol, IonCard, IonImg, onIonViewWillEnter } from "@ionic/vue";
import debug from "@/lib/utils/debug";
import shopsDb, { ShopInterface, clerkDefaultFor, customClerkName } from "@/lib/databases/ShopsDb";
import { hoursSummary, isShopOpen } from "@/lib/services/shops/shopHours";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { shopWorldBackground } from "../../hooks/useShopData";

export default defineComponent({
  name: "XpEconomyShops",
  components: {
    XpLoading,
    IonPage,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonImg
  },
  setup() {
    const router = useRouter();
    const shops = ref<ShopInterface[]>([]);
    const isLoading = ref(true);
    const now = ref(new Date());

    // The first visit shows the spinner; coming back from a shop's tabs quietly refreshes what they changed.
    const loadShops = async () => {
        try {
            await shopsDb.seedDefaults();
            shops.value = await shopsDb.getShops();
            now.value = new Date();
        } catch {
            debug.error("Failed to load shops");
        } finally {
            isLoading.value = false;
        }
    };

    onMounted(() => {
        loadShops();
    });
    onIonViewWillEnter(() => {
        if (!isLoading.value) loadShops();
    });

    // What each card says comes from the shop itself: the clerk heroes meet, the shelf count, the hours.
    const cards = computed(() =>
      shops.value.map((shop) => ({
        id: shop.id,
        name: shop.name,
        icon: shop.icon,
        image: shopWorldBackground(shop.world),
        clerk: customClerkName(shop) || clerkDefaultFor(shop.id).shopkeep,
        itemCount: shop.items?.length ?? 0,
        isOpen: isShopOpen(shop.hours, now.value),
        hours: hoursSummary(shop.hours),
      }))
    );

    const clickShop = (shopId: string) => {
      router.push({
        name: "xp-shop-dashboard",
        params: { shopId },
      });
    };

    return {
      cards,
      isLoading,
      clickShop,
    };
  },
});
// End of component
</script>

<style lang="scss" scoped>
  // Tall enough for the info under the name; taller when a long name or clerk wraps
  $shop-card-min-height: 18rem;

  .shop-card {
    margin: 8px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(30, 30, 40, 0.8);

    // The theme makes ion-card display:block, so the overlay (not the card) fills the height and pins the
    // content to the bottom; slotted content cannot inherit the card's min-height, hence the shared variable.
    &.portrait-card {
      min-height: $shop-card-min-height;
      height: calc(100% - 16px);
    }

    &:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);

      .shop-bg-image {
        transform: scale(1.1);
        opacity: 0.9;
      }

      .card-overlay {
        background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.4) 100%);
      }
    }

    .card-overlay {
      position: relative;
      z-index: 2;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.1) 100%);
      width: 100%;
      height: 100%;
      min-height: $shop-card-min-height;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 36px 10px 14px;
      transition: background 0.3s ease;
    }

    .open-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 2px 8px;
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #fff;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.6);

      &.is-open i {
        color: var(--ion-color-success);
      }

      &.is-closed i {
        color: var(--ion-color-danger);
      }
    }

    .shop-icon-wrapper {
      color: var(--eb-color-pale-yellow, #f4d03f);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .shop-name {
      max-width: 100%;
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 1.15rem;
      line-height: 1.2;
      color: white;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
      overflow-wrap: anywhere;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }

    .shop-facts {
      width: 100%;
      margin: 4px 0 0;
      padding: 8px 0 0;
      list-style: none;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-family: "Apple Kid", sans-serif;
      font-size: 0.95rem;
      line-height: 1.25;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);

      li {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-bottom: 3px;
      }

      i {
        flex: 0 0 18px;
        text-align: center;
        color: var(--eb-color-pale-yellow, #f4d03f);
      }

      span {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }

    .shop-bg-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      opacity: 0.7;
      z-index: 1;
      transition: transform 0.6s ease;
    }
  }
</style>
