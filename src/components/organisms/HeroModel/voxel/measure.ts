import type { HeroLook } from "@/lib/hero-look/types";
import { assembleHero } from "./assemble";
import { buildMeshData } from "./mesh";
import type { MeshData } from "./mesh";
import { partMeshInput } from "./partMesh";
import { PART_NAMES } from "./shape";
import type { Part, PartName } from "./shape";

/** What one part of a hero costs and what it meshes to */
export interface PartMeasure {
  boxes: number;
  quads: number;
  /** Stands for the exact geometry: two builds of the same art have the same signature (see `meshSignature`) */
  signature: string;
}

/** What a whole hero costs: boxes and quads summed over its parts, and the time to assemble and mesh them */
export interface HeroMeasure {
  boxes: number;
  quads: number;
  ms: number;
  parts: Record<PartName, PartMeasure>;
}

/**
 * A cheap stand-in for a mesh's shape: the quad count and a weighted sum of every position, so a face that moved, grew
 * or went missing changes it. Equal geometry gives an equal string.
 */
export const meshSignature = (data: MeshData): string => {
  let sum = 0;
  for (let i = 0; i < data.positions.length; i++) sum += data.positions[i] * ((i % 7) + 1);
  return `${data.faceCount}:${sum.toFixed(3)}`;
};

/**
 * Assembles a look and meshes every part, timing the pair. No cache and no three.js: the number is what a cold build
 * costs, and a test can run it in node.
 */
export const measureHero = (look: HeroLook): HeroMeasure => {
  const start = performance.now();
  const parts = assembleHero(look);
  const byName = new Map<PartName, Part>(parts.map((p) => [p.name, p]));
  const measured = {} as Record<PartName, PartMeasure>;
  let boxes = 0;
  let quads = 0;
  for (const name of PART_NAMES) {
    const part = byName.get(name);
    if (!part) throw new Error(`hero part missing: ${name}`);
    const input = partMeshInput(part, byName);
    const data = buildMeshData(input.boxes, input.occluders);
    measured[name] = { boxes: part.boxes.length, quads: data.faceCount, signature: meshSignature(data) };
    boxes += part.boxes.length;
    quads += data.faceCount;
  }
  return { boxes, quads, ms: performance.now() - start, parts: measured };
};

/** One line for a bench label: "46 boxes · 489 quads · 9.5 ms" */
export const formatMeasure = (m: HeroMeasure): string => `${m.boxes} boxes · ${m.quads} quads · ${m.ms.toFixed(1)} ms`;
