/**
 * The built-in content packs, in the order Settings > Packs shows them. A new pack is one file in this folder
 * (an XpPack, see packFormat.ts) and one line here.
 */
import type { XpPack } from "../packFormat";
import { FAMILY_PACK } from "./family";

export const BUILT_IN_PACKS: readonly XpPack[] = [FAMILY_PACK];

export { FAMILY_PACK };
