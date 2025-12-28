import { ref, computed, watch, onMounted } from 'vue';
import { useUserStore } from '@/lib/store/stores/user';
import { calculatePlayerStats, getXpToNextLevel } from '@/lib/services/stats/PlayerStatsService';
import debug from '@/lib/utils/debug';

/**
 * Player data interface for battle context
 */
export interface BattlePlayer {
  id: string;
  name: string;
  nickname: string;
  level: number;
  hp: {
    current: number;
    max: number;
  };
  mp: {
    current: number;
    max: number;
  };
  xp: {
    current: number;
    toNextLevel: number;
  };
  stats: {
    attack: number;
    defense: number;
    speed: number;
    intelligence: number;
  };
  avatar?: string;
  jobClass: string;
}

/**
 * Battle Player Hook
 * 
 * Handles loading and managing player data for the battle field.
 * Uses PlayerStatsService to calculate proper HP/MP based on level and job class.
 */
export function useBattlePlayer() {
  const userStore = useUserStore();
  
  // Loading state
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  
  // Player data
  const player = ref<BattlePlayer | null>(null);
  
  /**
   * Get the current player from the user store
   */
  const currentPlayer = computed(() => {
    const current = userStore.currentUser;
    if (current && current.id) {
      return userStore.getUserById(current.id);
    }
    return null;
  });
  
  /**
   * Extract battle-relevant player data from user profile
   * Uses PlayerStatsService for proper HP/MP calculation
   */
  const extractPlayerData = (userData: any): BattlePlayer | null => {
    if (!userData || !userData.id) {
      return null;
    }
    
    // Extract base info
    const stats = userData.stats || {};
    const specialStats = stats.special || {};
    const level = stats.level || 1;
    const jobClass = userData.jobClass || 'default';
    
    // Get XP info
    const xpStats = stats.xp || {};
    const currentXp = xpStats.now || 0;
    const xpToNextLevel = getXpToNextLevel(level);
    
    // Calculate proper HP/MP using the stats service
    // Pass current HP/MP if available (to preserve damage taken)
    const currentHp = stats.hp?.now;
    const currentMp = stats.mp?.now;
    
    const calculatedStats = calculatePlayerStats(
      level,
      jobClass,
      specialStats,
      currentHp,
      currentMp
    );
    
    debug.log('BattlePlayer: Calculated stats', {
      level,
      jobClass,
      specialStats,
      calculatedStats
    });
    
    return {
      id: userData.id,
      name: userData.name?.full || userData.name?.first || 'Player',
      nickname: userData.name?.nick || userData.name?.first || 'Player',
      level,
      hp: {
        current: calculatedStats.hp.now,
        max: calculatedStats.hp.max
      },
      mp: {
        current: calculatedStats.mp.now,
        max: calculatedStats.mp.max
      },
      xp: {
        current: currentXp,
        toNextLevel: xpToNextLevel
      },
      stats: {
        attack: specialStats.strength || 10,
        defense: specialStats.defense || specialStats.endurance || 5,
        speed: specialStats.agility || 8,
        intelligence: specialStats.intelligence || 10
      },
      avatar: userData.avatar,
      jobClass
    };
  };
  
  /**
   * Load the player data
   */
  const loadPlayer = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Ensure users are loaded
      await userStore.loadUsers();
      
      // Get current player data
      const userData = currentPlayer.value;
      
      if (userData) {
        player.value = extractPlayerData(userData);
        debug.log('BattlePlayer: Loaded player data', player.value);
      } else {
        debug.warn('BattlePlayer: No current user found');
        error.value = 'No player profile found';
      }
    } catch (err) {
      debug.error('BattlePlayer: Error loading player', err);
      error.value = 'Failed to load player data';
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Refresh player data from store
   */
  const refreshPlayer = () => {
    const userData = currentPlayer.value;
    if (userData) {
      player.value = extractPlayerData(userData);
    }
  };
  
  /**
   * Get formatted HP for display (thou, hun, ten digits)
   */
  const formattedHp = computed(() => {
    const hp = player.value?.hp.current || 0;
    const [thou, hun, ten] = String(hp).padStart(3, '0');
    
    return {
      thou: thou === '0' ? '' : thou,
      hun: hun === '0' ? '' : hun,
      ten,
      value: hp
    };
  });
  
  /**
   * Get formatted MP for display (thou, hun, ten digits)
   */
  const formattedMp = computed(() => {
    const mp = player.value?.mp.current || 0;
    const [thou, hun, ten] = String(mp).padStart(3, '0');
    
    return {
      thou: thou === '0' ? '' : thou,
      hun: hun === '0' ? '' : hun,
      ten,
      value: mp
    };
  });
  
  /**
   * Get player name for display
   */
  const playerName = computed(() => {
    return player.value?.nickname || 'Player';
  });
  
  /**
   * Get HP percentage for health bar
   */
  const hpPercentage = computed(() => {
    if (!player.value) return 100;
    return (player.value.hp.current / player.value.hp.max) * 100;
  });
  
  /**
   * Get MP percentage for mana bar
   */
  const mpPercentage = computed(() => {
    if (!player.value) return 100;
    if (player.value.mp.max === 0) return 100; // Avoid division by zero
    return (player.value.mp.current / player.value.mp.max) * 100;
  });
  
  // Watch for changes in the current user
  watch(currentPlayer, (newUser) => {
    if (newUser) {
      player.value = extractPlayerData(newUser);
    }
  }, { deep: true });
  
  // Load player on mount
  onMounted(() => {
    loadPlayer();
  });
  
  return {
    // State
    player,
    isLoading,
    error,
    
    // Computed for HUD display
    playerName,
    formattedHp,
    formattedMp,
    hpPercentage,
    mpPercentage,
    
    // Actions
    loadPlayer,
    refreshPlayer,
    
    // Raw access to current player from store
    currentPlayer
  };
}

