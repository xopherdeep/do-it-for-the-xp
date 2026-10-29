import type { Beast } from "@/lib/databases/BestiaryDb";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";

/**
 * The picture a raid shows for a beast: its elite look when the library gave it one (a raid beast is a great one), else its
 * portrait, else the family's own picture. "" when there is none, so the card draws no image.
 */
export const raidBeastImage = (beast: Beast | undefined): string => {
  const elite = beastPortraitUrl(beast?.variantAvatar);
  const portrait = beastPortraitUrl(beast?.avatar);
  const own = beast?.imageUrl || beast?.localImage || "";
  return elite || portrait || own;
};
