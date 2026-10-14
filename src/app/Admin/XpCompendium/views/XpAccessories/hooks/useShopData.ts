import { ref, computed, InjectionKey, Ref, onMounted } from "vue";
import { toastController } from "@ionic/vue";
import shopsDb, { ShopInterface } from "@/lib/databases/ShopsDb";
import debug from "@/lib/utils/debug";
import { normalWorld } from "../shopWizard";

// Only world-*.webp / hometown.webp are looked up by key; keep the filter (a bare context bundles all 90 MB)
const requireBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.webp$/);

const findBg = (file: string): string => {
  try {
    return requireBg(file);
  } catch {
    return "";
  }
};

// The art for a world id (the list of ids is SHOP_WORLD_CHOICES in ../shopWizard); an old name the create form used to
// offer (mountain, snow) is read as the art it meant, and a world with no art of its own ("traveling", "volcano",
// any other free-text value) gets the world map.
export function shopWorldBackground(world?: string | null): string {
  const id = normalWorld(world) || "hometown";
  const file = id === "hometown" ? "./hometown.webp" : `./world-${id}.webp`;
  return findBg(file) || findBg("./world-map.webp") || findBg("./hometown.webp");
}

// Writes the changed fields to the shop record, then onto the shop the tabs share so they all show it.
// A field passed as undefined is removed.
export async function saveShopFields(shop: ShopInterface, fields: Partial<ShopInterface>): Promise<void> {
  await shopsDb.setShop({ ...shop, ...fields }); // undefined fields drop out when the record is flattened to JSON
  const live = shop as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) delete live[key];
    else live[key] = value;
  }
}

export async function shopToast(message: string): Promise<void> {
  const toast = await toastController.create({ message, duration: 2500, position: "top", cssClass: "rpg-toast" });
  await toast.present();
}

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
  
  const bgImage = computed(() => {
    if (!shop.value) return '';
    return shopWorldBackground(shop.value.world); // Hometown if missing
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
