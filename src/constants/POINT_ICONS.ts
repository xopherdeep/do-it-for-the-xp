// Point type icons - centralized icon definitions for XP, GP, AP, HP, MP
export const POINT_ICONS = {
  xp: {
    icon: 'fa-seedling',
    color: 'success',
    label: 'XP'
  },
  gp: {
    icon: 'fa-coin',
    color: 'warning',
    label: 'GP'
  },
  ap: {
    icon: 'fa-dharmachakra fa-spin',
    color: 'secondary',
    label: 'AP'
  },
  hp: {
    icon: 'fa-heartbeat fa-grow',
    color: 'danger',
    label: 'HP'
  },
  mp: {
    icon: 'fa-spa',
    color: 'tertiary',
    label: 'MP'
  }
} as const;

export type PointType = keyof typeof POINT_ICONS;
