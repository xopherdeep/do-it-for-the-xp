/**
 * Party Stats
 *
 * Pure functions for party statistics:
 * - Party streak: consecutive local calendar days ending on today with at least one approved quest log entry.
 * - Activity feed: the newest 20 approved quest log entries formatted as '<nickname> finished <quest name> (+<xp> XP)', newest first.
 *
 * Pure: no storage, no Vue, no stores.
 */

export interface QuestLogEntryLike {
  id?: string;
  questId?: string;
  questName?: string;
  userId?: string;
  completedAt?: string;
  dayKey?: string;
  status?: string;
  rewards?: {
    xp?: number;
    gp?: number;
    ap?: number;
  };
}

export interface PartyActivityItem {
  id: string;
  text: string;
  userId: string;
  nickname: string;
  questName: string;
  xp: number;
  completedAt: string;
  user?: any;
}

export interface PartyMember {
  id: string;
  name?: { full?: string; nick?: string };
  avatar?: string;
  jobClass?: string;
  race?: string;
  role?: string;
  isAdult?: boolean;
  stats?: { level?: number; hp?: any; mp?: any; xp?: any };
}

/** Local calendar day key: YYYY-MM-DD */
export const toDayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** The day key of the preceding calendar day, using noon local time to avoid DST issues */
export const previousDayKey = (dayKey: string): string => {
  const parts = dayKey.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() - 1);
  return toDayKey(date);
};

/**
 * Calculates the party streak: consecutive local calendar days up to today with at least one
 * approved quest log entry by any hero.
 */
export const calculatePartyStreak = (
  entries: ReadonlyArray<QuestLogEntryLike | null | undefined>,
  today: Date | string = new Date()
): number => {
  const isString = typeof today === "string";
  const todayKey = isString ? today : toDayKey(today);
  const approvedDays = new Set<string>();

  for (const entry of entries) {
    const isApproved = Boolean(entry && entry.status === "approved");
    if (isApproved) {
      const hasCompletedAt = Boolean(entry?.completedAt);
      const computedKey = hasCompletedAt ? toDayKey(new Date(entry!.completedAt!)) : "";
      const key = entry?.dayKey || computedKey;
      const hasKey = Boolean(key);
      if (hasKey) approvedDays.add(key);
    }
  }

  let streak = 0;
  let currentKey = todayKey;
  while (approvedDays.has(currentKey)) {
    streak++;
    currentKey = previousDayKey(currentKey);
  }

  return streak;
};

export const partyStreak = calculatePartyStreak;

/** Resolves hero nickname from users map or array */
export const nicknameOf = (
  userId: string | undefined,
  users: Record<string, any> | ReadonlyArray<any>
): string => {
  const hasUserId = Boolean(userId);
  if (!hasUserId) return "Hero";
  let user: any = null;
  const isArray = Array.isArray(users);
  if (isArray) {
    user = users.find((u) => Boolean(u && String(u.id) === String(userId)));
  } else {
    const isObject = Boolean(users && typeof users === "object");
    if (isObject) {
      user = users[userId!];
    }
  }
  const nick = user?.name?.nick?.trim();
  const hasNick = Boolean(nick);
  if (hasNick) return nick;
  const full = user?.name?.full?.trim();
  const hasFull = Boolean(full);
  if (hasFull) return full;
  return "Hero";
};

/** Formats a single quest completion activity line: '<nickname> finished <quest name> (+<xp> XP)' */
export const formatPartyActivityLine = (
  entry: Pick<QuestLogEntryLike, "userId" | "questName" | "rewards">,
  users: Record<string, any> | ReadonlyArray<any>
): string => {
  const nickname = nicknameOf(entry.userId, users);
  const questName = entry.questName || "Untitled Quest";
  const xp = Math.max(0, entry.rewards?.xp ?? 0);
  return `${nickname} finished ${questName} (+${xp} XP)`;
};

/**
 * Builds the activity feed: newest approved quest log entries up to limit (default 20),
 * formatted as '<nickname> finished <quest name> (+<xp> XP)', newest first.
 */
export const partyActivityFeed = (
  entries: ReadonlyArray<QuestLogEntryLike | null | undefined>,
  users: Record<string, any> | ReadonlyArray<any>,
  limit: number = 20
): PartyActivityItem[] => {
  const approved = entries.filter(
    (entry): entry is QuestLogEntryLike => Boolean(entry && entry.status === "approved")
  );

  const sorted = approved.slice().sort((a, b) => {
    const timeA = a.completedAt || "";
    const timeB = b.completedAt || "";
    return timeB.localeCompare(timeA);
  });

  const isArray = Array.isArray(users);
  const userMap: Record<string, any> = isArray
    ? Object.fromEntries(users.filter(Boolean).map((u) => [u.id, u]))
    : (users || {});

  return sorted.slice(0, limit).map((entry, index) => {
    const text = formatPartyActivityLine(entry, users);
    const userId = entry.userId || "";
    const user = userMap[userId];
    return {
      id: entry.id || `activity-${index}`,
      text,
      userId,
      nickname: nicknameOf(userId, users),
      questName: entry.questName || "Untitled Quest",
      xp: Math.max(0, entry.rewards?.xp ?? 0),
      completedAt: entry.completedAt || "",
      user,
    };
  });
};

/** Formats relative time since completion */
export const formatTime = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const isJustNow = minutes < 1;
  if (isJustNow) return "Just now";
  const isUnderHour = minutes < 60;
  if (isUnderHour) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const isUnderDay = hours < 24;
  if (isUnderDay) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
