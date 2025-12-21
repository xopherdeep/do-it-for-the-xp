import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import XpApi from "@/lib/api/doit.forthexp.com.api";

export const useGameStore = defineStore('game', () => {
  // --- Global UI State ---
  const devMode = ref(false);
  const area = ref<any>(null);
  const theme = reactive({
    ui: 'nintendo',
    rpg: 'earthbound'
  });
  const userActions = ref<any[]>([]);

  // --- Entity Collections (Caching) ---
  const abilities = reactive<Record<string, any>>({});
  const accessories = reactive<Record<string, any>>({});
  const achievements = reactive<Record<string, any>>({});
  const media = reactive<Record<string, any>>({});

  const requests = reactive<Record<string, any[]>>({
    xp_ability: [],
    xp_accessory: [],
    xp_achievement: [],
    media: [],
  });

  // --- Actions ---

  function setDevMode(enabled: boolean) {
    devMode.value = enabled;
  }

  function setArea(newArea: any) {
    area.value = newArea;
  }

  function setUserActions(actions: any[]) {
    userActions.value = actions;
  }

  function addEntity(type: string, item: any) {
    if (!item || !type) return;
    
    if (type === 'xp_ability') abilities[item.id] = item;
    else if (type === 'xp_accessory') accessories[item.id] = item;
    else if (type === 'xp_achievement') achievements[item.id] = item;
    else if (type === 'media') media[item.id] = item;
  }

  function addRequest(type: string, request: any) {
    if (requests[type]) {
      requests[type].push(request);
    }
  }

  async function fetchItems(type: string, params: any) {
    const dejaVu = findRequest(type, params);
    
    const runApi = async () => {
      const response = await XpApi.get(type, params);
      const { data } = response;
      
      // addRequest
      const ids = data.results.map((i: any) => i.id);
      addRequest(type, { params: { ...params }, ids, total: data.total, total_pages: data.total_pages });
      
      // addData
      addData(type, data);
      
      return response;
    };

    if (dejaVu) {
      return new Promise((resolve) => setTimeout(() => resolve(runApi()), 5000));
    }
    return runApi();
  }

  async function fetchWPItems(type: string, params: any) {
    const dejaVu = findRequest(type, params);
    
    const runApi = async () => {
      const response = await XpApi.get(type, params);
      const { data, headers } = response;
      
      // addWPRequest
      const total = headers.get("x-wp-total");
      const total_pages = headers.get("x-wp-totalpages");
      const ids = data.map((i: any) => i.id);
      addRequest(type, { params: { ...params }, ids, total, total_pages });
      
      // addData
      addData(type, { results: data });
      
      return response;
    };

    if (dejaVu) {
      return new Promise((resolve) => setTimeout(() => resolve(runApi()), 1000));
    }
    return runApi();
  }

  function addData(type: string, data: any) {
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((item: any) => addEntity(type, item));
    }
  }

  function changeSoundFX(payload: { ui: string, rpg: string }) {
    theme.ui = payload.ui;
    theme.rpg = payload.rpg;
  }

  // --- Getters (Functional) ---

  function findRequest(type: string, params: any) {
    if (!type || !requests[type]) return undefined;
    
    return requests[type].find((request: any) => {
      if (Object.keys(request.params).length === Object.keys(params).length) {
        return Object.keys(request.params).every((key) => {
          return request.params[key] == params[key];
        });
      }
      return false;
    });
  }

  function getRequestedItems(type: string, params: any) {
    const request = findRequest(type, params);
    if (!request) return [];
    
    // Better way: explicitly check the collections
    const collections: Record<string, any> = { xp_ability: abilities, xp_accessory: accessories, xp_achievement: achievements, media };
    const items = collections[type];
    
    return request.ids.map((id: string) => items?.[id]).filter(Boolean);
  }

  function getSingleById(type: string, id: string) {
    const collections: Record<string, any> = { xp_ability: abilities, xp_accessory: accessories, xp_achievement: achievements, media };
    return collections[type]?.[id];
  }

  function getTotalPages(type: string, params: any) {
    const request = findRequest(type, params);
    return request ? request.total_pages : 0;
  }

  function getTotalItems(type: string, params: any) {
    const request = findRequest(type, params);
    return request ? request.total : 0;
  }

  return {
    // State
    devMode,
    area,
    theme,
    userActions,
    abilities,
    accessories,
    achievements,
    media,
    requests,

    // Actions
    setDevMode,
    setArea,
    setUserActions,
    addEntity,
    addRequest,
    changeSoundFX,
    fetchItems,
    fetchWPItems,
    addData,

    // Functional Getters
    findRequest,
    getRequestedItems,
    getSingleById,
    getTotalPages,
    getTotalItems
  };
});
