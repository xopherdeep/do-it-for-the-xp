import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";

/**
 * The words of the "the village awaits your word" box: who is waiting, the longest waiter first. Pure, so a spec can read it.
 */
export const villageLine = (claims: readonly QuestLogEntry[], nickOf: (heroId: string) => string): string => {
  const [oldest] = claims;
  if (!oldest) return "";
  const first = `${nickOf(oldest.userId)} finished "${oldest.questName}".`;
  const others = claims.length - 1;
  const isAlone = others === 0;
  if (isAlone) return first;
  return `${first} ${others} more ${others === 1 ? "waits" : "wait"} behind it.`;
};
