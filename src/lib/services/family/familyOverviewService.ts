import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { dailyStreak } from "@/lib/services/streaks/dailyStreak";
import { tierOf, TIER_TITLES, type StreakTier } from "@/lib/services/streaks/streakCard";
import { dueFor, dueLabelFor, type QuestListStatus } from "@/lib/services/quests/QuestList";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";

export interface MemberHpMp {
  now: number;
  max: number;
}

export interface MemberXpProgress {
  current: number;
  nextLevel: number;
  percent: number;
}

export interface MemberPurse {
  wallet: number;
  bank: number;
  total: number;
}

export interface MemberStreakSummary {
  current: number;
  best: number;
  tier: StreakTier;
  tierTitle: string;
  shields: number;
  isDoneToday: boolean;
}

export interface MemberChoresSummary {
  totalAssigned: number;
  doneCount: number;
  pendingCount: number;
  openCount: number;
  overdueCount: number;
}

export interface FamilyChoreItem {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  dueLabel: string;
  status: QuestListStatus;
  statusLabel: string;
  rewards: { xp: number; gp: number; ap: number };
}

export interface FamilyOverviewMember {
  id: string;
  nick: string;
  fullName: string;
  isAdult: boolean;
  jobClass: string;
  level: number;
  hp: MemberHpMp;
  mp: MemberHpMp;
  xp: MemberXpProgress;
  gp: MemberPurse;
  streak: MemberStreakSummary;
  chores: MemberChoresSummary;
  todayQuests: FamilyChoreItem[];
  rawUser: Record<string, any>;
}

export interface FamilyOverviewSummary {
  totalMembers: number;
  totalHeroes: number;
  totalAdults: number;
  totalChoresToday: number;
  completedChoresToday: number;
  choresProgressPercent: number;
  pendingApprovalsCount: number;
  totalFamilyGp: number;
  longestStreak: number;
  members: FamilyOverviewMember[];
  allTodayChores: FamilyChoreItem[];
}

const parseNumber = (val: unknown, fallback = 0): number => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

const extractHp = (stats: any): MemberHpMp => {
  const hpObj = stats?.hp;
  const isObject = typeof hpObj === "object" && hpObj !== null;
  const now = isObject ? parseNumber(hpObj.now, 30) : parseNumber(hpObj, 30);
  const max = isObject ? parseNumber(hpObj.max, 30) : parseNumber(stats?.maxHp, 30);
  return { now: Math.max(0, now), max: Math.max(1, max) };
};

const extractMp = (stats: any): MemberHpMp => {
  const mpObj = stats?.mp;
  const isObject = typeof mpObj === "object" && mpObj !== null;
  const now = isObject ? parseNumber(mpObj.now, 10) : parseNumber(mpObj, 10);
  const max = isObject ? parseNumber(mpObj.max, 10) : parseNumber(stats?.maxMp, 10);
  return { now: Math.max(0, now), max: Math.max(1, max) };
};

const extractXp = (stats: any): MemberXpProgress => {
  const xpObj = stats?.xp;
  const current = parseNumber(xpObj?.current ?? stats?.xp, 0);
  const nextLevel = parseNumber(xpObj?.next_level ?? stats?.nextLevel, 100);
  const validNext = Math.max(1, nextLevel);
  const percent = Math.min(100, Math.max(0, Math.round((current / validNext) * 100)));
  return { current, nextLevel: validNext, percent };
};

const extractGp = (stats: any): MemberPurse => {
  const gpObj = stats?.gp;
  const wallet = parseNumber(gpObj?.wallet, 0);
  const bank = parseNumber(gpObj?.bank, 0);
  return { wallet, bank, total: wallet + bank };
};

const extractStreak = (entries: QuestLogEntry[], userId: string, date: Date): MemberStreakSummary => {
  const heroStreak = dailyStreak(entries, userId, date);
  const current = heroStreak.current;
  const best = heroStreak.best;
  const tier = tierOf(current);
  const tierTitle = TIER_TITLES[tier];
  const shields = heroStreak.shields;
  const isDoneToday = heroStreak.doneToday;
  return { current, best, tier, tierTitle, shields, isDoneToday };
};

const resolveChoreStatus = (item: QuestBoardItem): { status: QuestListStatus; label: string } => {
  const isOverdue = item.overdue;
  if (isOverdue) return { status: "overdue", label: "Overdue" };
  const isPending = item.pending;
  if (isPending) return { status: "pending", label: "Pending" };
  const isDone = item.status === "done";
  if (isDone) return { status: "done", label: "Tamed" };
  return { status: "open", label: "Open" };
};

export const mapBoardItemToChore = (
  item: QuestBoardItem,
  assigneeId: string,
  assigneeName: string,
  today: Date = new Date()
): FamilyChoreItem => {
  const quest = item.quest;
  const id = String(quest.id || "");
  const title = quest.achievementName || "Untitled Quest";
  const due = dueFor(quest, undefined, today);
  const dueLabel = dueLabelFor(due, today);
  const { status, label: statusLabel } = resolveChoreStatus(item);
  const rewards = {
    xp: parseNumber(quest.xp, 0),
    gp: parseNumber(quest.gp, 0),
    ap: parseNumber(quest.ap, 0),
  };
  return { id, title, assigneeId, assigneeName, dueLabel, status, statusLabel, rewards };
};

export interface FamilyOverviewBuildParams {
  users: Record<string, any> | any[];
  questLogs: QuestLogEntry[];
  userBoards: Record<string, QuestBoardItem[]>;
  pendingApprovals: QuestLogEntry[];
  today?: Date;
}

export const buildFamilyOverview = (params: FamilyOverviewBuildParams): FamilyOverviewSummary => {
  const { users, questLogs, userBoards, pendingApprovals, today = new Date() } = params;
  const rawList: any[] = Array.isArray(users) ? users : Object.values(users);
  const activeProfiles = rawList.filter((u) => u && (u.id || u.name));

  const allTodayChores: FamilyChoreItem[] = [];
  let totalChoresToday = 0;
  let completedChoresToday = 0;
  let totalFamilyGp = 0;
  let longestStreak = 0;

  const members: FamilyOverviewMember[] = activeProfiles.map((user) => {
    const id = String(user.id);
    const nick = user.name?.nick || user.name?.first || user.name?.full || "Hero";
    const fullName = user.name?.full || nick;
    const isAdult = user.isAdult === true;
    const jobClass = user.jobClass || (isAdult ? "Game Master" : "Hero");
    const stats = user.stats || {};
    const level = parseNumber(stats.level, 1);

    const hp = extractHp(stats);
    const mp = extractMp(stats);
    const xp = extractXp(stats);
    const gp = extractGp(stats);
    totalFamilyGp += gp.total;

    const streak = extractStreak(questLogs, id, today);
    const isNewLongest = streak.current > longestStreak;
    if (isNewLongest) {
      longestStreak = streak.current;
    }

    const boardItems = userBoards[id] || [];
    const todayBoardItems = boardItems.filter((item) => item.status !== "notDue");
    const memberChores: FamilyChoreItem[] = todayBoardItems.map((item) => {
      const chore = mapBoardItemToChore(item, id, nick, today);
      allTodayChores.push(chore);
      return chore;
    });

    const doneCount = memberChores.filter((c) => c.status === "done").length;
    const pendingCount = memberChores.filter((c) => c.status === "pending").length;
    const overdueCount = memberChores.filter((c) => c.status === "overdue").length;
    const openCount = memberChores.filter((c) => c.status === "open").length;
    const totalAssigned = memberChores.length;

    totalChoresToday += totalAssigned;
    completedChoresToday += doneCount;

    return {
      id,
      nick,
      fullName,
      isAdult,
      jobClass,
      level,
      hp,
      mp,
      xp,
      gp,
      streak,
      chores: { totalAssigned, doneCount, pendingCount, openCount, overdueCount },
      todayQuests: memberChores,
      rawUser: user,
    };
  });

  const totalMembers = members.length;
  const totalAdults = members.filter((m) => m.isAdult).length;
  const totalHeroes = totalMembers - totalAdults;
  const hasChores = totalChoresToday > 0;
  const choresProgressPercent = hasChores ? Math.round((completedChoresToday / totalChoresToday) * 100) : 100;

  return {
    totalMembers,
    totalHeroes,
    totalAdults,
    totalChoresToday,
    completedChoresToday,
    choresProgressPercent,
    pendingApprovalsCount: pendingApprovals.length,
    totalFamilyGp,
    longestStreak,
    members,
    allTodayChores,
  };
};
