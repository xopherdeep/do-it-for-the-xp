/**
 * The confetti behind the new-hero reveal: pure physics, no DOM. Chips are shot in from all four edges of the
 * screen, aimed at the middle where the hero stands; they arc up, tumble, fall under gravity and blink out. All
 * sizes and speeds are in "cells": the burst canvas is a few cells per CSS pixel, drawn crisp and scaled up, so every
 * chip is a chunky 16-bit pixel and a few hundred of them cost nothing.
 */

export type ChipShape = "square" | "diamond" | "star";

export interface Chip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: ChipShape;
  /** In cells: 1 is a single pixel (a diamond is a plus of five of them) */
  size: number;
  color: string;
  /** Tumble: the chip is edge-on and face-on as this turns */
  spin: number;
  spinRate: number;
  age: number;
  life: number;
  /** Seconds to wait before it leaves the edge, so a wave is a spray and not a wall */
  delay: number;
}

export interface Bounds {
  width: number;
  height: number;
}

/** Earthbound's palette, gold, and a pink and a white for the sparkle */
export const CONFETTI_COLORS = [
  "#f7e8a8", // pale yellow
  "#ffd84a", // gold
  "#ffb347", // amber
  "#68d0b8", // minty blue
  "#80d890", // mint green
  "#68a8d8", // sky blue
  "#f08cb4", // pink
  "#ffffff",
];

/** The most chips alive at once: plenty to fill a phone, light enough for any of them */
export const CHIP_CAP = 360;

/** Cells per second squared, and the slowest a chip ever falls (paper, not stones) */
const GRAVITY = 78;
const TERMINAL_FALL = 45;
const SWAY = 9;
/** How fast the sideways speed of the throw bleeds away (per second), and how long the throw lasts */
const DRAG = 0.9;
const THROW_SECONDS = 1;

type Random = () => number;
type Edge = "left" | "right" | "top" | "bottom";
const EDGES: Edge[] = ["left", "right", "top", "bottom"];

const between = (random: Random, low: number, high: number): number => low + random() * (high - low);

const pick = <T>(random: Random, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

/** Where on the edge the chip starts: just outside it, anywhere along it. */
const startOn = (edge: Edge, bounds: Bounds, random: Random): { x: number; y: number } => {
  switch (edge) {
    case "left":
      return { x: -2, y: between(random, 0.05, 0.95) * bounds.height };
    case "right":
      return { x: bounds.width + 2, y: between(random, 0.05, 0.95) * bounds.height };
    case "top":
      return { x: between(random, 0.05, 0.95) * bounds.width, y: -2 };
    default:
      return { x: between(random, 0.05, 0.95) * bounds.width, y: bounds.height + 2 };
  }
};

const shapeOf = (random: Random): ChipShape => {
  const roll = random();
  if (roll < 0.08) return "star";
  if (roll < 0.4) return "diamond";
  return "square";
};

/**
 * One chip shot from `edge`. Its launch velocity is solved so that after `flight` seconds it passes through a point
 * near the middle of the screen (where the hero stands), whatever the edge, and gravity does the rest.
 */
export const chipFrom = (edge: Edge, bounds: Bounds, random: Random = Math.random, maxDelay = 0.25): Chip => {
  const { x, y } = startOn(edge, bounds, random);
  const targetX = bounds.width * (0.5 + between(random, -0.3, 0.3));
  const targetY = bounds.height * (0.4 + between(random, -0.2, 0.2));
  // The edge a chip comes from sets how long it has to get there: the long way up from the floor is the slowest
  const flight = edge === "bottom" ? between(random, 1.1, 1.7) : between(random, 0.8, 1.4);
  const shape = shapeOf(random);
  return {
    x,
    y,
    // The drag eats the throw as it flies: the launch speed is the one that still arrives after it
    vx: ((targetX - x) * DRAG) / (1 - Math.exp(-DRAG * flight)),
    vy: (targetY - y - 0.5 * GRAVITY * flight * flight) / flight,
    shape,
    size: shape === "star" ? between(random, 1.6, 2.4) : pick(random, [1, 2, 2, 3]),
    color: pick(random, CONFETTI_COLORS),
    spin: between(random, 0, Math.PI * 2),
    spinRate: between(random, 5, 11) * (random() < 0.5 ? -1 : 1),
    age: 0,
    life: between(random, 3.2, 4.8),
    delay: between(random, 0, maxDelay),
  };
};

/** A wave: `perEdge` chips from each of the four edges, never past the cap with `alive` already on screen. */
export const burstFromEdges = (
  bounds: Bounds,
  perEdge: number,
  alive = 0,
  random: Random = Math.random,
  maxDelay = 0.25,
): Chip[] => {
  const room = Math.max(0, CHIP_CAP - alive);
  const each = Math.min(perEdge, Math.floor(room / EDGES.length));
  const chips: Chip[] = [];
  for (let n = 0; n < each; n++) {
    EDGES.forEach((edge) => chips.push(chipFrom(edge, bounds, random, maxDelay)));
  }
  return chips;
};

/** Moves every chip on by `dt` seconds and returns the ones still in play (off the bottom, or out of life, are gone). */
export const stepChips = (chips: Chip[], dt: number, bounds: Bounds): Chip[] => {
  const alive: Chip[] = [];
  for (const chip of chips) {
    if (chip.delay > 0) {
      chip.delay -= dt;
      alive.push(chip);
      continue;
    }
    chip.age += dt;
    chip.vy += GRAVITY * dt;
    // Paper: once it is falling it settles to a drifting fall instead of speeding up
    const isFalling = chip.age > THROW_SECONDS && chip.vy > TERMINAL_FALL;
    if (isFalling) chip.vy -= (chip.vy - TERMINAL_FALL) * Math.min(1, 8 * dt);
    // The sideways speed of the throw bleeds away, and the chip sways as it tumbles
    chip.vx *= Math.max(0, 1 - DRAG * dt);
    chip.x += (chip.vx + Math.sin(chip.spin * 0.5) * SWAY * Math.min(1, chip.age)) * dt;
    chip.y += chip.vy * dt;
    chip.spin += chip.spinRate * dt;
    const isGone = chip.age >= chip.life || chip.y > bounds.height + 6;
    if (!isGone) alive.push(chip);
  }
  return alive;
};

/** True while a chip in the last stretch of its life should be skipped this frame, so it blinks out like a sprite. */
export const isBlinkedOut = (chip: Chip): boolean => {
  const left = chip.life - chip.age;
  return left < 0.7 && Math.floor(chip.age * 20) % 2 === 0;
};

/** How wide the chip is face-on right now, in cells (it is edge-on when the spin crosses a quarter turn). */
export const chipWidth = (chip: Chip): number => Math.max(1, Math.round(chip.size * Math.abs(Math.cos(chip.spin))));
