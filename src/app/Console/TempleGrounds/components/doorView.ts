/** What the door reveal shows: what the door says and whether the hero can open it, from the temple's door rules (doorActions). */
export interface DoorView {
  kind: 'locked' | 'master';
  canOpen: boolean;
  header: string;
  line: string;
  keys: number;
}
