/**
 * What the Tower Keeper says when a project is won, in the game's own prompt (never a native alert): the family reward,
 * in the Game Master's own words, shown to each hero once. The wording is the `projectFinish.reward.*` lines of the
 * copy catalogue; this turns it into the prompt to show, so the screens stay thin and the words are tested without one.
 */
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { towerNameOf } from "./projectFinish";
import type { ProjectRecord } from "./projectRecord";

/** "Family reward unlocked!": the tower won, what the family earned (their own words, as written), who hands it over. One Onward. */
export const rewardRevealPrompt = (project: ProjectRecord, voice: Voice): RevealPromptOptions => ({
  speaker: copyFor("projectTower.keeper", voice),
  title: copyFor("projectFinish.reward.title", voice),
  sprite: "chest",
  glow: "gold",
  lines: [copyFor("projectFinish.reward.won", voice, { tower: towerNameOf(project, voice) }), project.reward.text, copyFor("projectFinish.reward.ask", voice)],
  choices: [{ id: "onward", label: copyFor("projectTower.onward", voice), icon: "arrow-right", tone: "primary" }],
  cancelId: "onward",
});
