import { ref, computed, InjectionKey, Ref, onMounted } from "vue";
import { toastController } from "@ionic/vue";
import shopsDb, { ShopInterface } from "@/lib/databases/ShopsDb";
import debug from "@/lib/utils/debug";

// Only world-*.jpg / hometown.jpg are looked up by key; keep the filter (a bare context bundles all 90 MB)
const requireBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.jpg$/);

// The world art a shop can wear (a shop's `world` is one of these ids), in the order the Decorate tab lists it.
export const SHOP_WORLD_CHOICES: { id: string; label: string }[] = [
  { id: "hometown", label: "Hometown" },
  { id: "plains", label: "Plains" },
  { id: "forest", label: "Forest" },
  { id: "islands", label: "Islands" },
  { id: "mountains", label: "Mountains" },
  { id: "desert", label: "Desert" },
  { id: "swamps", label: "Swamps" },
  { id: "ice", label: "Tundra" },
  { id: "clouds", label: "Clouds" },
  { id: "moon", label: "Moon" },
  { id: "map", label: "World Map" },
];

const findBg = (file: string): string => {
  try {
    return requireBg(file);
  } catch {
    return "";
  }
};

// The art for a world id; a world with no art of its own ("traveling", an old free-text value) gets the world map.
export function shopWorldBackground(world?: string | null): string {
  const id = world || "hometown";
  const file = id === "hometown" ? "./hometown.jpg" : `./world-${id}.jpg`;
  return findBg(file) || findBg("./world-map.jpg") || findBg("./hometown.jpg");
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
