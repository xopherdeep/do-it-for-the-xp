import { createRoom } from "./roomFacorty";
import * as R from "./roomTypes"

const windTemple = {
  maze: [
    [],

  ],
  rooms: {
    [R.EMPT]: createRoom("empty"),
    [R.SAVE]: createRoom("save"),
    [R.WALL]: createRoom("wall"),
    [R.ENTR]: createRoom("entrance"),
    [R.GATE]: createRoom("gate"),
    [R.TELE]: createRoom("teleport"),
    [R.BOSS]: createRoom("boss"),
    [R.MONS]: createRoom("monster"),
    [R.HLTH]: createRoom("health"),
    [R.MANA]: createRoom("mana"),
    [R.LOOT]: createRoom("loot"),
    [R.SHOP]: createRoom("shop"),
    [R.KEYR]: createRoom("key"),
    [R.LOCK]: createRoom("lock"),
    [R.TRAP]: createRoom("trap"),
    [R.PUZL]: createRoom("puzzle"),
  }

}