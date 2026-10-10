/** One entry in the in-dialog command menu (Attack / Defend / Run Away, or a confirm pair). */
export interface BattleMenuAction {
  id: string;
  label: string;
  faIcon: string;
  click: () => void;
  /** Spans both menu columns (the Attack row). */
  fullWidth?: boolean;
}
