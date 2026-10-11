import AchievementDb, { Achievement, achievementStorage } from "@/lib/databases/AchievementDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import {
    getQuestProgressFor,
    hasPendingClaimFor,
    isDayOff,
    isQuestOverdue,
    questMatchesSegment,
    questTimesOfDay,
    slotsFor,
    type HeroQuestEffects,
    type QuestProgress,
    type QuestSlot,
    type TimeOfDay,
} from "@/lib/engine/quests/QuestSchedule";

export interface QuestFilter {
    userId?: string | number;
    search?: string;
    segment?: 'all' | TimeOfDay;
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
     * Get the segment a quest belongs to: the first part of the day it is timed for (its timesOfDay, else the
     * one its dueByTime falls in). Returns 'all' if it has no time.
     */
    getQuestSegment(quest: Achievement): 'all' | TimeOfDay {
        return questTimesOfDay(quest)[0] ?? 'all';
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

            // 3. Segment filter: a tab lists the quests timed for it; a quest with no time shows only under 'all'
            if (filter.segment && !questMatchesSegment(quest, filter.segment)) {
                return false;
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
            return { quest, status, progress, pending, overdue, slots: slotsFor(quest, progress) };
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
    /**
     * The quest's times of day and which are done in the current window (see QuestSchedule.slotsFor); empty for
     * a quest with no listed times. Always set by getQuestBoardForUser; hand-built items may leave it out.
     */
    slots?: QuestSlot[];
}

/**
 * How a board item reads under a calendar tab. "all" (and a quest with no slot for that time) keeps the
 * item's own status; under a time tab a quest that lists that time is done when its slot is, otherwise open.
 * A quest that is not due stays not due.
 */
export const boardStatusInSegment = (item: QuestBoardItem, segment: 'all' | TimeOfDay): QuestBoardStatus => {
    if (segment === 'all' || item.status === 'notDue') return item.status;
    const slot = item.slots?.find(({ time }) => time === segment);
    if (!slot) return item.status;
    return slot.done ? 'done' : 'open';
};

// Singleton instance
let questEngineInstance: QuestEngine | null = null;

export function getQuestEngine(): QuestEngine {
    if (!questEngineInstance) {
        questEngineInstance = new QuestEngine();
    }
    return questEngineInstance;
}

export default QuestEngine;
