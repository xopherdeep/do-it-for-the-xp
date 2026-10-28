/**
 * The copy catalogue: every line the game says, keyed by screen. Each screen's lines live in a file of their own in
 * this folder (`export const questWizard = { ... } satisfies CopyCatalog`); add the file here and `t("questWizard.title")`
 * is typed. Keys are unique across files (the catalogue spec checks it).
 */
import type { CopyCatalog } from "../voices";
import { apps } from "./apps";
import { beastCard } from "./beastCard";
import { demo } from "./demo";
import { family } from "./family";
import { npc } from "./npc";
import { projectTower } from "./projectTower";
import { projectWizard } from "./projectWizard";
import { questWizard } from "./questWizard";
import { quickStart } from "./quickStart";
import { speech } from "./speech";
import { sync } from "./sync";
import { temple } from "./temple";
import { wallet } from "./wallet";

/** The files the catalogue is made of, so a spec can check that no key is written twice */
export const CATALOG_PARTS: readonly CopyCatalog[] = [demo, questWizard, beastCard, apps, npc, speech, family, wallet, temple, sync, quickStart, projectWizard, projectTower];

export const CATALOG = { ...demo, ...questWizard, ...beastCard, ...apps, ...npc, ...speech, ...family, ...wallet, ...temple, ...sync, ...quickStart, ...projectWizard, ...projectTower } satisfies CopyCatalog;

export type CopyKey = keyof typeof CATALOG;
