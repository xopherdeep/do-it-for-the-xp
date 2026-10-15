/**
 * The built-in content packs, in the order Settings > Packs shows them. A new pack is one file in this folder
 * (an XpPack, see packFormat.ts; definePack.ts writes one from short seeds) and one line here.
 */
import type { XpPack } from "../packFormat";
import { FAMILY_PACK } from "./family";
import { CLASSROOM_PACK } from "./classroom";
import { HOMESCHOOL_PACK } from "./homeschool";
import { STUDY_PACK } from "./study";
import { FITNESS_PACK } from "./fitness";
import { HOUSEHOLD_PACK } from "./household";
import { SOLO_PACK } from "./solo";
import { WORKPLACE_PACK } from "./workplace";

export const BUILT_IN_PACKS: readonly XpPack[] = [
  FAMILY_PACK,
  CLASSROOM_PACK,
  HOMESCHOOL_PACK,
  STUDY_PACK,
  FITNESS_PACK,
  HOUSEHOLD_PACK,
  SOLO_PACK,
  WORKPLACE_PACK,
];

export { FAMILY_PACK };
