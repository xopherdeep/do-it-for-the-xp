import type { HeroLook } from "@/lib/hero-look/types";
import { body } from "./outfits";
import { head } from "./head";
import { hair, HAT_COVERS_TOP } from "./hair";
import { hat } from "./hats";
import { held } from "./held";
import { translate } from "./shape";
import type { Part } from "./shape";

export const HEAD_PIVOT = { x: 0, y: 8, z: 0 } as const;

/** Every part of the hero for a look, in character space. Pure: no three.js. */
export const assembleHero = (look: HeroLook): Part[] => {
  // A raised hood and a hat both want the crown: the hat wins and the hood falls back on the shoulders
  const hood = look.outfit === "hoodie" && look.hat === "none";
  const { parts, headGear } = body(look.skin, look.outfit, look.outfitColor, look.outfitAccent, { hood });

  parts.push({
    name: "head",
    pivot: { ...HEAD_PIVOT },
    boxes: [
      ...head(look.skin, look.face, look.eyeColor),
      ...hair(look.hair, look.hairColor, { covered: HAT_COVERS_TOP.has(look.hat), hooded: hood }),
      ...hat(look.hat, look.hatColor),
      ...headGear,
    ],
  });

  const carry = (handName: "handL" | "handR", armName: "armL" | "armR", icon?: string) => {
    const item = held(icon);
    if (!item) return;
    const handPart = parts.find((p) => p.name === handName);
    const armPart = parts.find((p) => p.name === armName);
    const cannotCarry = !handPart || !armPart;
    if (cannotCarry) return;
    handPart.boxes.push(...translate(item.boxes, handPart.pivot));
    armPart.raise = item.raise;
  };
  carry("handL", "armL", look.leftHand);
  carry("handR", "armR", look.rightHand);

  return parts;
};
