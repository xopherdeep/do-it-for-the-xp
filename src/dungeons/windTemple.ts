import { createRoom } from "./roomFacorty";
import * as R from "./roomTypes"

const windTemple = {
  maze: [
    [],

  ],
  rooms: {
    [R.O__O]: createRoom("empty"),
    [R.SAVE]: createRoom("save"),
    [R.____]: createRoom("wall"),
    [R._00_]: createRoom("entrance"),
    [R.GATE]: createRoom("gate"),
    [R.TELE]: createRoom("teleport"),
    [R.X__X]: createRoom("boss"),
    [R.q__q]: createRoom("monster"),
    [R.H__P]: createRoom("health"),
    [R.M__P]: createRoom("mana"),
    [R.$__$]: createRoom("loot"),
    [R.SHOP]: createRoom("shop"),
    [R.K___]: createRoom("key"),
    // [R.LOCK]: createRoom("lock"),
    [R._XX_]: createRoom("trap"),
    [R.PUZL]: createRoom("puzzle"),
  }

}