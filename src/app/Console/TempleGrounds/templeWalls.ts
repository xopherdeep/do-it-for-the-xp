/** The wall layer's vocabulary: what each side of a room is. */
export type WallSide = "north" | "south" | "east" | "west";
/** `master` is the boss door: barred like a locked one, with the big gold lock only the Boss Key opens */
export type ExitKind = "wall" | "door" | "locked" | "master";
