/**
 * The part library: pure box lists in character space (16 units tall, feet at the origin, +Y up, +Z toward the camera).
 * No three.js in here, see voxel/mesh.ts for the box -> triangles step and voxel/build.ts for the scene graph.
 */
export { body } from "./outfits";
export type { BodyOptions, BodyParts } from "./outfits";
export { head } from "./head";
export { hair, HAT_COVERS_TOP } from "./hair";
export type { HairOptions } from "./hair";
export { hat } from "./hats";
export { held, heldKind } from "./held";
export type { Held, HeldKind } from "./held";
export { box, both, mirrorX, translate, shade, lighten, mix, PALETTE } from "./shape";
export type { Box, Part, PartName, Vec3 } from "./shape";
