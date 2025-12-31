/**
 * Engine Stats Service
 * 
 * Centralized service for fetching high-level system statistics.
 * This provides a uniform way of getting stats like user counts, achievement counts, etc.
 */

import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import DosDontsDb from "@/lib/databases/DosDontsDb";
import { useUserStore } from "@/lib/store/stores/user";

export interface SystemStats {
    users: number;
    achievements: number;
    beasts: number;
    abilities: number;
    dos: number;
    donts: number;
    temples: number;
    items: number;
    shops: number;
}

class EngineStatsService {
    private achievementDb = new AchievementDb(achievementStorage);
    private bestiaryDb = new BestiaryDb(beastStorage);
    private abilitiesDb = new AbilitiesDb(abilitiesStorage);
    private dosDontsDb = new DosDontsDb();

    /**
     * Get all system statistics
     */
    async getSystemStats(): Promise<SystemStats> {
        const userStore = useUserStore();

        // Ensure users are loaded for an accurate count
        if (Object.keys(userStore.users).length === 0) {
            await userStore.loadUsers();
        }

        const [achievements, beasts, abilities, allDosDonts] = await Promise.all([
            this.achievementDb.getTasks(),
            this.bestiaryDb.getBeasts(),
            this.abilitiesDb.getAbilities(),
            this.dosDontsDb.getAll()
        ]);

        return {
            users: userStore.usersAz.length,
            achievements: achievements.length,
            beasts: beasts.length,
            abilities: abilities.length,
            dos: allDosDonts.filter(item => item.type === 'do').length,
            donts: allDosDonts.filter(item => item.type === 'dont').length,
            temples: 3, // Placeholder for now as in original code
            items: 5,   // Placeholder for now as in original code
            shops: 2    // Placeholder for now as in original code
        };
    }
}

let serviceInstance: EngineStatsService | null = null;

export function getEngineStatsService(): EngineStatsService {
    if (!serviceInstance) {
        serviceInstance = new EngineStatsService();
    }
    return serviceInstance;
}

export default EngineStatsService;
