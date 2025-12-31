import AchievementDb, { Achievement, achievementStorage } from "@/lib/databases/AchievementDb";

export interface QuestFilter {
    userId?: string | number;
    search?: string;
    segment?: 'all' | 'morning' | 'noon' | 'evening' | 'night';
}

/**
 * QuestEngine - Centralized service for quest filtering and retrieval
 * Used by both Daily Agenda (MyCalendar) and Quest Log (MyQuests)
 */
class QuestEngine {
    private achievementDb: AchievementDb;

    constructor() {
        this.achievementDb = new AchievementDb(achievementStorage);
    }

    /**
     * Get all quests from local database
     */
    async getAllQuests(): Promise<Achievement[]> {
        return this.achievementDb.getTasks();
    }

    /**
     * Check if a quest is an open bounty (available to everyone)
     */
    isOpenBounty(quest: Achievement): boolean {
        return quest.type === 'asNeeded';
    }

    /**
     * Check if a quest is assigned to a specific user
     */
    isAssignedToUser(quest: Achievement, userId: string | number): boolean {
        return quest.assignee && quest.assignee.includes(String(userId));
    }

    /**
     * Check if a quest should be visible to a user
     * A quest is visible if it's an open bounty OR assigned to the user
     */
    isVisibleToUser(quest: Achievement, userId: string | number): boolean {
        return this.isOpenBounty(quest) || this.isAssignedToUser(quest, userId);
    }

    /**
     * Get the segment a quest belongs to based on its dueByTime
     * Returns 'all' if no time is set
     */
    getQuestSegment(quest: Achievement): 'all' | 'morning' | 'noon' | 'evening' | 'night' {
        const time = quest.dueByTime;
        if (!time) return 'all';

        const hour = parseInt(time.split(':')[0]);
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'noon';
        if (hour >= 18 && hour < 24) return 'evening';
        if (hour >= 0 && hour < 6) return 'night';
        return 'all';
    }

    /**
     * Filter quests based on provided filters
     */
    filterQuests(quests: Achievement[], filter: QuestFilter): Achievement[] {
        return quests.filter(quest => {
            // 1. User-based filter
            if (filter.userId !== undefined) {
                if (!this.isVisibleToUser(quest, filter.userId)) {
                    return false;
                }
            }

            // 2. Search filter
            if (filter.search) {
                const query = filter.search.toLowerCase();
                const name = (quest.achievementName || '').toLowerCase();
                if (!name.includes(query)) {
                    return false;
                }
            }

            // 3. Segment filter (skip if 'all')
            if (filter.segment && filter.segment !== 'all') {
                const questSegment = this.getQuestSegment(quest);
                // Quests with no time (segment 'all') show in every segment
                if (questSegment !== 'all' && questSegment !== filter.segment) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Get filtered quests for a user with optional search and segment
     */
    async getQuestsForUser(userId: string | number, filter?: Partial<QuestFilter>): Promise<Achievement[]> {
        const allQuests = await this.getAllQuests();
        return this.filterQuests(allQuests, { userId, ...filter });
    }
}

// Singleton instance
let questEngineInstance: QuestEngine | null = null;

export function getQuestEngine(): QuestEngine {
    if (!questEngineInstance) {
        questEngineInstance = new QuestEngine();
    }
    return questEngineInstance;
}

export default QuestEngine;
