import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import Api from "@/lib/api";
import { getGPService } from '@/lib/services/gp/GPService';

export const useUserStore = defineStore('user', () => {
  // --- State ---
  const currentUser = reactive({
    id: null as string | null,
    isAuthenticated: true, // Defaulting to true as per legacy index.ts
    stats: null as any
  });

  const users = reactive<Record<string, any>>({});

  const usersAz = computed(() => {
    return Object.values(users).sort((a, b) => {
      const nameA = a.name?.nick || '';
      const nameB = b.name?.nick || '';
      return nameA.localeCompare(nameB);
    });
  });

  // --- Actions ---

  function loginUser(userData: any) {
    Object.assign(currentUser, userData);
    currentUser.isAuthenticated = true;
  }

  function logoutUser() {
    currentUser.isAuthenticated = false;
  }

  async function loadUsers() {
    try {
      const response = await Api.get("users");
      // Handle both raw array and axios-like response { data: [] }
      const usersList = Array.isArray(response) ? response : response.data;
      
      if (Array.isArray(usersList)) {
        usersList.forEach(user => {
          users[user.id] = user;
        });

        // Set default currentUser if not set
        if (!currentUser.id && users["1"]) {
          loginUser(users["1"]);
        }
      }
    } catch (error) {
      console.error("Failed to load users", error);
    }
  }

  function addUser(user: any) {
    users[user.id] = user;
  }

  /**
   * Getter for matching Vuex behavior
   */
  const getUserById = (id: string | number) => {
    const user = users[id];
    return user || users[1]; // Fallback to id 1 as in legacy getters.js
  };

  /**
   * Update User GP and persist to local storage
   */
  async function updateUserGP(payload: { userId: string, wallet?: number, savings?: number, debt?: number }) {
    const { userId, wallet, savings, debt } = payload;
    
    if (users[userId]) {
      const userStats = users[userId].stats || { gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 } };
      
      // Initialize stats if missing
      if (!userStats.gp) userStats.gp = { wallet: 0, savings: 0, debt: 0, limit: 1000 };
      
      if (wallet !== undefined) userStats.gp.wallet = (userStats.gp.wallet || 0) + wallet;
      if (savings !== undefined) userStats.gp.savings = (userStats.gp.savings || 0) + savings;
      if (debt !== undefined) userStats.gp.debt = (userStats.gp.debt || 0) + debt;
      
      // Update state
      users[userId].stats = userStats;
      
      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      // Persist via Service
      await getGPService().syncGP(userId);
    }
  }

  function impersonateUser(userId: string) {
    if (users[userId]) {
      Object.assign(currentUser, users[userId]);
      currentUser.id = userId;
      currentUser.isAuthenticated = true;
    }
  }

  return {
    currentUser,
    users,
    getUserById,
    loginUser,
    logoutUser,
    loadUsers,
    addUser,
    updateUserGP,
    impersonateUser,
    usersAz
  };
});
