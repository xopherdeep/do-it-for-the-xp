/**
 * Engine Stats Service
 * 
 * Centralized service for fetching high-level system statistics.
 * This provides a uniform way of getting stats like user counts, achievement counts, etc.
 * getCompendiumStats loads the data behind the Setup XP slideshow and hands it to CompendiumStats.
 */

import type { Storage as IonicStorage } from "@ionic/storage";
import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import DosDontsDb from "@/lib/databases/DosDontsDb";
import { getQuestLogDb, questLogStorage } from "@/lib/databases/QuestLogDb";
import { ShopsDb, shopStorage } from "@/lib/databases/ShopsDb";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import builtInTemples from "@/lib/engine/temples";
import { useUserStore } from "@/lib/store/stores/user";
import { compendiumStats, countDistinctIds, layoutOf, type CompendiumStats, type TempleLike } from "./CompendiumStats";

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

/** The nine temples that ship in code, as records the figures can count. */
const shippedTemples = (): TempleLike[] =>
    Object.entries(builtInTemples).map(([id, temple]) => ({
        id,
        dungeonLayout: { maze: temple.maze, rooms: temple.rooms },
    }));

class EngineStatsService {
    private achievementDb = new AchievementDb(achievementStorage);
    private bestiaryDb = new BestiaryDb(beastStorage);
    private abilitiesDb = new AbilitiesDb(abilitiesStorage);
    private accessoriesDb = new AccessoriesDb(accessoriesStorage);
    private shopsDb = new ShopsDb(shopStorage);
    private templeDb = new TempleDb(templeStorage);
    private dosDontsDb = new DosDontsDb();
    // The slides all ask at once when the slideshow opens: they share one load
    private compendiumLoad: Promise<CompendiumStats> | null = null;

    /**
     * Get all system statistics
     */
    async getSystemStats(): Promise<SystemStats> {
        await this.ready();
        const profiles = await this.loadProfiles();

        const [achievements, beasts, abilities, allDosDonts, templeRecords, shopRecords, accessories] = await Promise.all([
            this.achievementDb.getTasks(),
            this.bestiaryDb.getBeasts(),
            this.abilitiesDb.getAbilities(),
            this.dosDontsDb.getAll(),
            this.templeDb.getAll(),
            this.shopsDb.getShops(),
            this.accessoriesDb.getAccessories()
        ]);

        return {
            users: profiles.length,
            achievements: achievements.length,
            beasts: beasts.length,
            abilities: abilities.length,
            dos: allDosDonts.filter(item => item.type === 'do').length,
            donts: allDosDonts.filter(item => item.type === 'dont').length,
            // The nine shipped temples plus the Game Master's own, once per id
            temples: countDistinctIds(Object.keys(builtInTemples), templeRecords.map(temple => temple?.id)),
            items: accessories.filter(Boolean).length,
            // The shop registry's shops plus any the Game Master added, once per id
            shops: countDistinctIds(getAllShops().map(shop => shop.id), shopRecords.map(shop => shop.id))
        };
    }

    /**
     * The figures behind the Setup XP slides: heroes, quests, beasts, quest log and temples, worked out now.
     */
    getCompendiumStats(): Promise<CompendiumStats> {
        this.compendiumLoad ??= this.loadCompendiumStats().finally(() => {
            this.compendiumLoad = null;
        });
        return this.compendiumLoad;
    }

    private async loadCompendiumStats(): Promise<CompendiumStats> {
        await this.ready();
        const [profiles, quests, beasts, questLog, temples] = await Promise.all([
            this.loadProfiles(),
            this.achievementDb.getTasks(),
            this.bestiaryDb.getBeasts(),
            getQuestLogDb().getEntries(),
            this.loadTemples()
        ]);
        return compendiumStats({ profiles, quests, beasts, questLog, temples }, new Date());
    }

    /** Every profile; the store is loaded first when nothing has asked for it yet. */
    private async loadProfiles(): Promise<any[]> {
        const userStore = useUserStore();

        // Ensure users are loaded for an accurate count
        const hasNoUsersLoaded = Object.keys(userStore.users).length === 0;
        if (hasNoUsersLoaded) {
            await userStore.loadUsers();
        }
        return userStore.usersAz;
    }

    /**
     * The Game Master's temples, then the shipped ones. A stored record without a layout still plays the
     * shipped layout of its id; the figures count each id once, the first listed.
     */
    private async loadTemples(): Promise<TempleLike[]> {
        const shipped = shippedTemples();
        const stored = ((await this.templeDb.getAll()) as Array<TempleLike | null | undefined>).filter(
            (temple): temple is TempleLike => Boolean(temple?.id)
        );
        const withLayouts = stored.map(temple =>
            layoutOf(temple) ? temple : { ...temple, dungeonLayout: shipped.find(({ id }) => id === temple.id)?.dungeonLayout }
        );
        return [...withLayouts, ...shipped];
    }

    /** The databases read with a fresh instance are only usable once their storage is created. */
    private ready(): Promise<unknown> {
        const storages: IonicStorage[] = [
            achievementStorage,
            beastStorage,
            abilitiesStorage,
            accessoriesStorage,
            questLogStorage,
            shopStorage,
            templeStorage
        ];
        return Promise.all(storages.map(storage => storage.create()));
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
