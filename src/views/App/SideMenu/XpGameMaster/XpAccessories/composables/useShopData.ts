import { ref, computed, InjectionKey, Ref, onMounted } from "vue";
import shopsDb, { ShopInterface } from "@/lib/databases/ShopsDb";
import debug from "@/lib/utils/debug";

const requireBg = require.context("@/assets/images/backgrounds/");

export interface ShopDataInterface {
  shop: Ref<ShopInterface | null>;
  isLoading: Ref<boolean>;
  bgImage: Ref<string>;
  error: Ref<any>;
  refresh: () => Promise<void>;
}

export const ShopDataInjectionKey: InjectionKey<ShopDataInterface> = Symbol("ShopData");

export function useShopData(shopId: string | Ref<string>) {
  const shop = ref<ShopInterface | null>(null);
  const isLoading = ref(true);
  const error = ref<any>(null);
  
  const getBgUrl = (world: string) => {
    try {
      return requireBg(`./world-${world}.jpg`);
    } catch {
       try {
         return requireBg('./world-map.jpg');
       } catch {
         return '';
       }
    }
  };

  const bgImage = computed(() => {
    if (!shop.value) return '';
    return getBgUrl(shop.value.world || 'hometown'); // Default if missing
  });

  const loadShop = async () => {
    isLoading.value = true;
    error.value = null;
    const sId = typeof shopId === 'string' ? shopId : shopId.value;
    
    try {
      const data = await shopsDb.getShopById(sId);
      if (data) {
        shop.value = data;
      } else {
        debug.warn(`Shop ${sId} not found`);
        error.value = `Shop ${sId} not found`;
      }
    } catch (err) {
      debug.error('Error loading shop', err);
      error.value = err;
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(() => {
    loadShop();
  });

  return {
    shop,
    isLoading,
    bgImage,
    error,
    refresh: loadShop
  };
}
