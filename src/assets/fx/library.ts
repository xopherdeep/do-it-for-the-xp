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
    chronoTrigger: chronoTriggerSounds,
    finalFantasy: finalFantasySounds,
    // No Zelda sound set yet: the Zelda game style plays the Earthbound sounds
    zelda: earthboundSounds,
  },
};

export default $fx;
