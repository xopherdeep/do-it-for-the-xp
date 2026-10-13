<template>
  <div class="temple-walls" :class="`temple-walls--${element}`" aria-hidden="true">
    <div v-for="side in SIDES" :key="side" class="wall" :class="[`wall--${side}`, `wall--${exits[side]}`]">
      <!-- Top-down: the lighter cap is the top of the wall, the darker face is the side you see from the room -->
      <div class="wall__cap"></div>
      <div class="wall__face"></div>
      <!-- A sconce burns on a solid wall -->
      <div v-if="exits[side] === 'wall'" class="sconce">
        <i class="fad fa-fire-alt"></i>
      </div>
      <!-- An archway the hero can walk through, lit from beyond -->
      <div v-else class="doorway">
        <div class="doorway__glow"></div>
        <div class="doorway__jamb doorway__jamb--a"></div>
        <div class="doorway__jamb doorway__jamb--b"></div>
        <template v-if="exits[side] === 'locked' || exits[side] === 'master'">
          <div class="doorway__bars"></div>
          <i class="fad fa-lock doorway__lock" :class="{ 'doorway__lock--master': exits[side] === 'master' }"></i>
        </template>
      </div>
    </div>
    <div v-for="corner in CORNERS" :key="corner" class="corner" :class="`corner--${corner}`"></div>
  </div>
</template>

<script setup lang="ts">
import type { ExitKind, WallSide } from "./templeWalls";

withDefaults(
  defineProps<{
    /** What each side of the room is, from the maze: a solid wall, an open door, a locked one or the boss door */
    exits: Record<WallSide, ExitKind>;
    /** The temple's element picks the stone and metal colours */
    element?: string;
  }>(),
  { element: "wind" }
);

const SIDES: WallSide[] = ["north", "south", "east", "west"];
const CORNERS = ["nw", "ne", "sw", "se"];
</script>

<style lang="scss" scoped>
// The walls scale with the shorter side of the viewport, so a phone and a tablet both get a frame
.temple-walls {
  --wall: clamp(34px, 9vmin, 64px);
  --door: clamp(110px, 28vmin, 190px);
  --stone: #5c4a5c;
  --stone-dark: #3a2c3a;
  --metal: #cd9646;
  --metal-hi: #fad78c;
  --glow: #fff2d0;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;

  &--fire   { --stone: #3c2828; --stone-dark: #241616; --metal: #be6e32; --metal-hi: #ffbe6e; --glow: #ff7828; }
  &--ice    { --stone: #5a6e8c; --stone-dark: #3a4a62; --metal: #a0bedc; --metal-hi: #ebf5ff; --glow: #f0faff; }
  &--water  { --stone: #324650; --stone-dark: #1e2c34; --metal: #967d46; --metal-hi: #e6c882; --glow: #96e6f0; }
  &--earth  { --stone: #463a2c; --stone-dark: #2c2419; --metal: #8c643c; --metal-hi: #d2aa6e; --glow: #96be5a; }
  &--light  { --stone: #786446; --stone-dark: #4c3f2c; --metal: #dcb450; --metal-hi: #ffeb96; --glow: #fff0b4; }
  &--shadow, &--moon { --stone: #282038; --stone-dark: #161020; --metal: #968caa; --metal-hi: #dcd2f0; --glow: #aa6eff; }
  &--wind, &--storm { --stone: #5c4a5c; --stone-dark: #3a2c3a; --metal: #cd9646; --metal-hi: #fad78c; --glow: #fff2d0; }
  &--home   { --stone: #4e3524; --stone-dark: #2e1c12; --metal: #c29547; --metal-hi: #f5d48a; --glow: #ffe6a0; }
}

.wall {
  position: absolute;
  overflow: visible;

  &--north { top: 0; left: 0; right: 0; height: var(--wall); }
  &--south { bottom: 0; left: 0; right: 0; height: var(--wall); }
  &--west  { top: 0; bottom: 0; left: 0; width: var(--wall); }
  &--east  { top: 0; bottom: 0; right: 0; width: var(--wall); }
}

// The cap: the top surface of the wall, lit from above, with block seams
.wall__cap {
  position: absolute;
  background:
    repeating-linear-gradient(90deg, transparent 0 26px, rgba(0, 0, 0, 0.22) 26px 28px),
    linear-gradient(var(--cap-hi, #fff2) 0, transparent 40%),
    linear-gradient(var(--stone), var(--stone));
  box-shadow: inset 0 0 0 2px var(--stone-dark);
}

// The face: the side of the wall that looks into the room, darker, with the metal rail along its foot
.wall__face {
  position: absolute;
  background:
    repeating-linear-gradient(90deg, transparent 0 22px, rgba(0, 0, 0, 0.3) 22px 24px),
    repeating-linear-gradient(0deg, transparent 0 14px, rgba(0, 0, 0, 0.3) 14px 16px),
    linear-gradient(var(--stone-dark), var(--stone-dark));
}

// North: we look straight at its face, the tallest one; inset shadow casts down into the face
.wall--north .wall__cap  { top: 0; left: 0; right: 0; height: 40%; }
.wall--north .wall__face { top: 40%; left: 0; right: 0; bottom: 0; border-bottom: 5px solid var(--metal); box-shadow: inset 0 8px 18px rgba(0, 0, 0, 0.6); }
// South: mostly its top surface, a short face toward the room
.wall--south .wall__cap  { bottom: 0; left: 0; right: 0; height: 62%; }
.wall--south .wall__face { bottom: 62%; left: 0; right: 0; top: 0; border-top: 5px solid var(--metal); }
// West and east: a cap and a face, seams running the other way
.wall--west .wall__cap   { top: 0; bottom: 0; left: 0; width: 55%; background-image: repeating-linear-gradient(0deg, transparent 0 26px, rgba(0, 0, 0, 0.22) 26px 28px), linear-gradient(90deg, var(--cap-hi, #fff2) 0, transparent 40%), linear-gradient(var(--stone), var(--stone)); }
.wall--west .wall__face  { top: 0; bottom: 0; left: 55%; right: 0; border-right: 5px solid var(--metal); box-shadow: inset 6px 0 14px rgba(0, 0, 0, 0.45); }
.wall--east .wall__cap   { top: 0; bottom: 0; right: 0; width: 55%; background-image: repeating-linear-gradient(0deg, transparent 0 26px, rgba(0, 0, 0, 0.22) 26px 28px), linear-gradient(270deg, var(--cap-hi, #fff2) 0, transparent 40%), linear-gradient(var(--stone), var(--stone)); }
.wall--east .wall__face  { top: 0; bottom: 0; right: 55%; left: 0; border-left: 5px solid var(--metal); }

// Corner pillars: square blocks that sit over the caps, each with a lit top
.corner {
  position: absolute;
  width: var(--wall);
  height: var(--wall);
  background: linear-gradient(135deg, var(--stone) 0 45%, var(--stone-dark) 46% 100%);
  box-shadow: inset 0 0 0 3px var(--stone-dark), inset 6px 6px 0 var(--cap-hi, #fff2);

  &::after {
    content: "";
    position: absolute;
    left: 28%;
    top: 28%;
    width: 44%;
    height: 44%;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, var(--metal-hi), var(--metal) 60%, var(--stone-dark));
  }

  &--nw { top: 0; left: 0; }
  &--ne { top: 0; right: 0; }
  &--sw { bottom: 0; left: 0; }
  &--se { bottom: 0; right: 0; }
}

// A torch on a solid wall
.sconce {
  position: absolute;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: var(--glow);
  font-size: 18px;
  filter: drop-shadow(0 0 8px var(--glow));
  animation: sconce-flicker 1.6s ease-in-out infinite;
}
.wall--north .sconce { left: 50%; top: calc(50% - 15px); transform: translateX(-50%); }
.wall--south .sconce { left: 50%; bottom: calc(50% - 15px); transform: translateX(-50%); }
.wall--west .sconce  { top: 50%; left: calc(50% - 15px); transform: translateY(-50%); }
.wall--east .sconce  { top: 50%; right: calc(50% - 15px); transform: translateY(-50%); }

// The opening through the wall
.doorway {
  position: absolute;
  background: #0c080a;
  overflow: hidden;
}
.wall--north .doorway, .wall--south .doorway { left: 50%; transform: translateX(-50%); width: var(--door); top: 0; bottom: 0; }
.wall--west .doorway, .wall--east .doorway   { top: 50%; transform: translateY(-50%); height: var(--door); left: 0; right: 0; }

// Light at the far end of the passage
.doorway__glow {
  position: absolute;
  inset: 0;
  opacity: 0.85;
}
.wall--north .doorway__glow { background: linear-gradient(to bottom, var(--glow), transparent 70%); }
.wall--south .doorway__glow { background: linear-gradient(to top, var(--glow), transparent 70%); }
.wall--west .doorway__glow  { background: linear-gradient(to right, var(--glow), transparent 70%); }
.wall--east .doorway__glow  { background: linear-gradient(to left, var(--glow), transparent 70%); }

// Stone jambs either side of the opening
.doorway__jamb {
  position: absolute;
  background: linear-gradient(var(--metal-hi), var(--metal));
  box-shadow: 0 0 0 2px var(--stone-dark);
}
.wall--north .doorway__jamb, .wall--south .doorway__jamb { top: 0; bottom: 0; width: 10px; }
.wall--north .doorway__jamb--a, .wall--south .doorway__jamb--a { left: 0; }
.wall--north .doorway__jamb--b, .wall--south .doorway__jamb--b { right: 0; }
.wall--west .doorway__jamb, .wall--east .doorway__jamb { left: 0; right: 0; height: 10px; }
.wall--west .doorway__jamb--a, .wall--east .doorway__jamb--a { top: 0; }
.wall--west .doorway__jamb--b, .wall--east .doorway__jamb--b { bottom: 0; }

// Bars and a padlock across a locked door
.doorway__bars {
  position: absolute;
  inset: 0;
}
.wall--north .doorway__bars, .wall--south .doorway__bars {
  background: repeating-linear-gradient(90deg, transparent 0 12px, var(--metal) 12px 17px, var(--metal-hi) 17px 18px, transparent 18px 20px);
}
.wall--west .doorway__bars, .wall--east .doorway__bars {
  background: repeating-linear-gradient(0deg, transparent 0 12px, var(--metal) 12px 17px, var(--metal-hi) 17px 18px, transparent 18px 20px);
}
.doorway__lock {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(16px, 4.5vmin, 26px);
  color: var(--metal-hi);
  --fa-secondary-color: var(--stone-dark);
  --fa-secondary-opacity: 1;
  filter: drop-shadow(0 1px 2px #000);
}
// The boss door: a bigger lock in gold, whatever the temple's metal
.doorway__lock--master {
  font-size: clamp(22px, 6.5vmin, 36px);
  color: #ffd650;
  --fa-secondary-color: #7a4a10;
  filter: drop-shadow(0 0 6px #ffb028) drop-shadow(0 1px 2px #000);
}

@keyframes sconce-flicker {
  0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.12); }
}
.wall--west .sconce, .wall--east .sconce { animation-name: sconce-flicker-side; }
@keyframes sconce-flicker-side {
  0%, 100% { opacity: 0.85; transform: translateY(-50%) scale(1); }
  50% { opacity: 1; transform: translateY(-50%) scale(1.12); }
}

@media (prefers-reduced-motion: reduce) {
  .sconce { animation: none; }
}
</style>
