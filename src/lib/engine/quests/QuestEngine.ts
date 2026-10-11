import AchievementDb, { Achievement, achievementStorage } from "@/lib/databases/AchievementDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import {
    getQuestProgressFor,
    hasPendingClaimFor,
    isDayOff,
    isQuestOverdue,
    type HeroQuestEffects,
    type QuestProgress,
} from "@/lib/engine/quests/QuestSchedule";

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
     * Every quest a hero may see. Drafts (quests the Game Master saved before finishing them in the
     * Compendium) stay out of every hero view: the board, the calendar, the Town Hall and battles.
     */
    async getAllQuests(): Promise<Achievement[]> {
        const quests = await this.achievementDb.getTasks();
        return quests.filter((quest) => !quest.draft);
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

    private static resolveBoardStatus(progress: QuestProgress | null): QuestBoardStatus {
        if (!progress) return 'notDue';
        if (progress.isOpen) return 'open';
        return 'done';
    }

    /**
     * Every quest visible to the hero, tagged with today's completion state:
     * open (can still be done), done (window used up), notDue (not scheduled for this day).
     * `pending` is set when a claim in the current window still waits for the Game Master; it counts
     * toward the allowance, so a done quest with `pending` is awaiting approval rather than tamed.
     * `effects` are the hero's own item effects (snoozes, pull-ins, extensions, a pause); `overdue` is set on an
     * open quest whose deadline for that day has passed.
     */
    async getQuestBoardForUser(
        userId: string,
        date: Date = new Date(),
        filter?: Partial<QuestFilter>,
        effects?: HeroQuestEffects
    ): Promise<QuestBoardItem[]> {
        const [quests, entries] = await Promise.all([
            this.getQuestsForUser(userId, filter),
            getQuestLogDb().getEntriesForUser(userId),
        ]);
        // Gale's Wind: a day off hides every chore
        if (isDayOff(effects, date)) return [];
        return quests.map((quest) => {
            const progress = getQuestProgressFor(quest, entries, userId, date, effects);
            const status: QuestBoardStatus = QuestEngine.resolveBoardStatus(progress);
            const pending = hasPendingClaimFor(quest, entries, userId, date, effects);
            const overdue = status === 'open' && isQuestOverdue(quest, effects, date);
            return { quest, status, progress, pending, overdue };
        });
    }

    /** Only the quests the hero can still complete on `date`. */
    async getOpenQuestsForUser(
        userId: string,
        date: Date = new Date(),
        filter?: Partial<QuestFilter>,
        effects?: HeroQuestEffects
    ): Promise<QuestBoardItem[]> {
        const board = await this.getQuestBoardForUser(userId, date, filter, effects);
        return board.filter((item) => item.status === 'open');
    }
}

export type QuestBoardStatus = 'open' | 'done' | 'notDue';

export interface QuestBoardItem {
    quest: Achievement;
    status: QuestBoardStatus;
    progress: QuestProgress | null;
    /** The hero has a claim in the current window that the Game Master has not approved or rejected yet */
    pending: boolean;
    /** Open, and its deadline on this day has passed (after the hero's Ice Wand and Chronos' Clock) */
    overdue: boolean;
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
