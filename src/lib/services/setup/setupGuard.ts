/**
 * Who may run the setup wizard. A run merges a whole world into the game, like a restore, so once a Game Master exists
 * only a Game Master (or a masquerading one) may do it; a game with no Game Master yet is open to anybody.
 */
export const SETUP_GM_ONLY_MESSAGE = "Only a Game Master can run setup.";

/** Why setup may not run now (toast text), or null when it may. `canManage` is canManageFamily's answer */
export const setupBlockedReason = (profiles: Iterable<{ isAdult?: unknown }>, canManage: boolean): string | null => {
  const hasGameMaster = Array.from(profiles).some((profile) => profile.isAdult === true);
  return hasGameMaster && !canManage ? SETUP_GM_ONLY_MESSAGE : null;
};
