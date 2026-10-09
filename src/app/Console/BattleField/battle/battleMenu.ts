/** One entry in the in-dialog command menu (Attack / Defend / Run Away). */
export interface BattleMenuAction {
  id: string;
  label: string;
  faIcon: string;
  click: () => void;
}
