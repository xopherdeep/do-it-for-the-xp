/**
 * Room and Door Icon Utilities
 */

/**
 * Gets the FontAwesome class for a door based on its state and the room's lockOnEnter setting
 */
export function getDoorIcon(
  direction: string, 
  adjacentRooms: any, 
  sideConfig: any, 
  lockOnEnter: boolean = false
): string {
  if (!adjacentRooms[direction]) {
    return 'fas fa-square-full';
  }

  // If Lock on Enter is enabled, all doors show as locked
  if (lockOnEnter) {
    return 'fas fa-lock';
  }

  const state = sideConfig[direction];
  return state === 'locked' ? 'fas fa-lock' : 'fas fa-lock-open';
}

/**
 * Gets the CSS class for a door based on its state and the room's lockOnEnter setting
 */
export function getDoorClass(
  direction: string, 
  adjacentRooms: any, 
  sideConfig: any, 
  lockOnEnter: boolean = false
): string {
  if (!adjacentRooms[direction]) {
    return 'state-wall';
  }

  if (lockOnEnter) {
    return 'state-locked-on-enter';
  }

  return `state-${sideConfig[direction]}`;
}

/**
 * Gets the effective state of a side ('door', 'locked', 'bombable', 'wall')
 * respecting the lockOnEnter setting.
 */
export function getSideState(
  direction: string,
  roomData: any
): string {
  return roomData?.sides?.[direction] || 'door';
}
