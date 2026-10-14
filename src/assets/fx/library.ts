// Imported first so the shared Audio singletons (and their looping listeners) exist before the themed sets are built
import "./sharedSounds";
import { uiSounds } from "./uiSounds";
import { earthboundSounds, chronoTriggerSounds, finalFantasySounds } from "./rpgSounds";
import { loadThemeChoice } from "@/lib/utils/gameStyle";

const $fx = {
  theme: loadThemeChoice(),
  ui: uiSounds,
  rpg: {
    earthbound: earthboundSounds,
    // Each set fills its gaps (the BGM slots, the battle sounds) from Earthbound, so a saved
    // game style never meets an undefined sound or soundtrack
    chronoTrigger: { ...earthboundSounds, ...chronoTriggerSounds },
    finalFantasy: { ...earthboundSounds, ...finalFantasySounds },
    // No Zelda sound set yet: the Zelda game style plays the Earthbound sounds
    zelda: earthboundSounds,
  },
};

export default $fx;
