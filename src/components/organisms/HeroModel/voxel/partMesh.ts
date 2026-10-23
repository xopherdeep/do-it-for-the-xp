import type { Box, Part, PartName } from "./shape";

/**
 * The parts whose rest pose touches another's, for the shade where they meet: the head sits on the torso and the torso
 * on the legs. Arms and hands swing and lift too far for a baked contact to hold, so they shade only themselves.
 */
export const CONTACTS: Partial<Record<PartName, PartName[]>> = {
  torso: ["head", "legL", "legR"],
  head: ["torso"],
  legL: ["torso"],
  legR: ["torso"],
};

/**
 * What the mesher is given for a part: its boxes and the boxes of the parts it touches (its occluders), both moved so
 * the part's pivot is the origin. Pure: no three.js, so a test can measure a hero without a scene.
 */
export const partMeshInput = (part: Part, byName: Map<PartName, Part>): { boxes: Box[]; occluders: Box[] } => {
  const { pivot } = part;
  const centre = (boxes: Box[]): Box[] => boxes.map((b) => ({ ...b, x: b.x - pivot.x, y: b.y - pivot.y, z: b.z - pivot.z }));
  const occluders = (CONTACTS[part.name] ?? []).flatMap((name) => byName.get(name)?.boxes ?? []);
  return { boxes: centre(part.boxes), occluders: centre(occluders) };
};
