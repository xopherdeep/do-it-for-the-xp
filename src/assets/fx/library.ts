// Imported first so the shared Audio singletons (and their looping listeners) exist before the themed sets are built
import "./sharedSounds";
import { uiSounds } from "./uiSounds";
import { earthboundSounds, chronoTriggerSounds, finalFantasySounds } from "./rpgSounds";

const $fx = {
  theme: {
    ui: "nintendo",
    rpg: "earthbound",
  },
  ui: uiSounds,
  rpg: {
    earthbound: earthboundSounds,
    chronoTrigger: chronoTriggerSounds,
    finalFantasy: finalFantasySounds,
  },
};

export default $fx;
