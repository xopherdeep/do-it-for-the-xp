<template>
  <div class="xp-economy-shops h-full">
    <div v-if="isLoading" class="flex justify-center items-center h-full">
      <XpLoading />
    </div>
    <ion-grid v-else>
      <ion-row>
        <!-- Shops List -->
        <ion-col
          size="6"
          size-lg="4"
          size-xl="3"
          v-for="shop in shops"
          :key="shop.id"
        >
          <ion-card
            button
            @click="clickShop(shop.id)"
            class="shop-card portrait-card"
          >
            <ion-img
              :src="getBgImage(shop.world)"
              class="shop-bg-image"
              alt="Shop background"
            ></ion-img>

            <div class="card-overlay">
              <div class="shop-icon-wrapper">
                <i :class="shop.icon + ' fa-3x'"></i>
              </div>
              <div class="world-label">{{ shop.name }}</div>
            </div>
          </ion-card>
        </ion-col>
      </ion-row>
    </ion-grid>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import debug from "@/lib/utils/debug";
import shopsDb, { ShopInterface } from "@/lib/databases/ShopsDb";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

const requireBg = require.context("@/assets/images/backgrounds/");

export default defineComponent({
  name: "XpEconomyShops",
  components: {
    XpLoading
  },
  setup() {
    const router = useRouter();
    const shops = ref<ShopInterface[]>([]);
    const isLoading = ref(true);

    const loadShops = async () => {
        isLoading.value = true;
        try {
            await shopsDb.seedDefaults();
            shops.value = await shopsDb.getShops();
        } catch {
            debug.error("Failed to load shops");
        } finally {
            isLoading.value = false;
        }
    };

    onMounted(() => {
        loadShops();
    });

    const getBgImage = (world: string) => {
      try {
        return requireBg(`./world-${world}.jpg`);
      } catch {
        // debug.warn(`Could not load world-${world}.jpg`);
        try {
          return requireBg('./world-map.jpg');
        } catch {
           return requireBg('./hometown.jpg');
        }
      }
    };

    const clickShop = (shopId: string) => {
      router.push({
        name: "xp-shop-splash",
        params: { shopId },
      });
    };

    return {
      shops,
      isLoading,
      getBgImage,
      clickShop,
    };
  },
});
// End of component
</script>

<style lang="scss" scoped>
.shop-card {
  margin: 8px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(30, 30, 40, 0.8);

  &.portrait-card {
    aspect-ratio: 1 / 1.4;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 20px;
    transition: background 0.3s ease;
  }

  .shop-icon-wrapper {
    margin-bottom: 10px;
    color: var(--eb-color-pale-yellow, #f4d03f);
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  .world-label {
    font-family: var(--xp-font-fantasy, 'Fantasy');
    font-size: 1.4rem;
    color: white;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
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
