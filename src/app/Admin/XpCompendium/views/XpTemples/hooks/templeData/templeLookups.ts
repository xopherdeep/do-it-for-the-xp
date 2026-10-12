/**
 * Icons, colours and backgrounds the Game Master screens pick for a temple, a room type, a monster size or a key item.
 */
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import debug from "@/lib/utils/debug";

// Only world-*.webp / hometown.webp are looked up by key; keep the filter (a bare context bundles all 90 MB)
const requireBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.webp$/);

export const getRoomTypeIcon = (type: string) => {
  return (ROOM_ICONS as any)[type] || 'fa-square';
};

export const getMonsterIcon = (size: string) => {
  const icons = {
    boss: 'fa-crown',
    miniboss: 'fa-helmet-battle',
    large: 'fa-dragon',
    medium: 'fa-skull',
    small: 'fa-ghost'
  };
  return (icons as any)[size] || 'fa-ghost';
};

export const getItemIcon = (name: string) => {
  const icons = {
    map: 'fa-map',
    compass: 'fa-compass',
    key: 'fa-key',
    master: 'fa-key-skeleton',
    'master-key': 'fa-key-skeleton',
    'pegasus whistle': 'fa-megaphone'
  };
  return (icons as any)[name.toLowerCase()] || 'fa-treasure-chest';
};

export const getTempleIconFor = (templeId: string) => {
  const icons = {
    "wind-temple": "fad fa-wind",
    "earth-temple": "fad fa-mountain",
    "water-temple": "fad fa-water",
    "fire-temple": "fad fa-fire",
    "ice-temple": "fad fa-snowflake",
    "light-temple": "fad fa-sun",
    "shadow-temple": "fad fa-moon",
  };
  return (icons as any)[templeId] || "fad fa-place-of-worship";
};

export const getTempleColorFor = (templeId: string) => {
  const colors = {
    "wind-temple": "primary",
    "earth-temple": "success",
    "water-temple": "tertiary",
    "fire-temple": "danger",
    "ice-temple": "light",
    "light-temple": "warning",
    "shadow-temple": "dark",
  };
  return (colors as any)[templeId] || "medium";
};

export const getTempleBgFor = (templeId: string) => {
  const worlds = {
    "wind-temple": "plains",
    "earth-temple": "forest",
    "water-temple": "islands",
    "fire-temple": "mountains",
    "ice-temple": "ice",
    "light-temple": "desert",
    "shadow-temple": "moon",
  };
  const world = (worlds as any)[templeId] || "plains";
  try {
    const img = requireBg(`./world-${world}.webp`);
    return `url(${img})`;
  } catch (err) {
    debug.log("Background load failed", err);
    return 'linear-gradient(135deg, #2c3e50, #4a69bd)';
  }
};
