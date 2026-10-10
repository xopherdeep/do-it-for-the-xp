# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Do It For The XP: a gamified family chore app (Vue 3 + Ionic 7 + Pinia + Capacitor, Vue CLI 5 / webpack, TypeScript). Parents are Game Masters (GM) who create quests in the Admin console; kids are heroes who complete them in the Player Portal and earn XP, GP (gold), AP (ability points). The look is SNES-era RPG (Earthbound, LTTP, Chrono Trigger): keep it retro. Data is local (Pinia stores persisted through `src/lib/services/core/StorageService` / localForage); there is no backend in the loop.

## Commands

```bash
pnpm serve                       # ionic serve, dev server on :8100 (the owner usually has it running)
pnpm typecheck                   # tsc --noEmit
pnpm lint                        # vue-cli-service lint (warnings are tolerated, errors are not)
pnpm test                        # jest 27 unit suite (tests/unit/*.spec.ts)
pnpm jest tests/unit/Foo.spec.ts # one spec; add -t "name" for one test
pnpm vue-cli-service test:e2e --headless --url http://localhost:8100 --spec tests/e2e/specs/battle.spec.js
                                 # Cypress 8 against a running server, 390x844; screenshots land in tests/e2e/screenshots
pnpm build                       # ionic build (production uses hash routing and relative publicPath)
python3 tools/chiptune/render_all.py [song...]   # re-render the chiptune soundtrack into src/assets/audio/chiptune
python3 tools/art/temple_floors.py               # regenerate the procedural temple floor tiles
chemx verify                     # the owner's wrapper that runs the gate and prints only failures
```

Gate before every commit: typecheck, lint, jest. Commit small and push to `origin master` when the owner has asked for pushes. The `docs/` folder is a git submodule.

E2E seams: in development `window.__xp` exposes `restoreBackup`, `loginUser`, `getUser`; `cy.seedWorld()` loads `tests/e2e/fixtures/battle-backup.json` and `cy.tapToWakeAudio()` unlocks audio. `three` must be transformed for jest (`tests/jest/esm-transform.js`).

## Architecture

- `src/app/Admin/` GM console: the Compendium (quests = "Achievements", bestiary, abilities, loot), approvals, temple creator.
- `src/app/Console/MyPortal/` the hero's portal shell (`MyPortal.vue/.ts`): an `ion-tabs` outlet, the HP/MP HUD on top (`UserHud/components/XpMainHud.vue`), a ledge with GP (`XpGpBar`) and XP (`XpXpBar`) above the shared bottom nav (`src/components/organisms/BottomNav/XpBottomNav.vue`: Left hand | Profile | Area | Party | Right hand). Area opens the equipment modal; the avatar menu (`XpFabUserHud`) holds Pegasus and Save & Quit. Sub-areas: `HomeTown/` (GoldBank, HospitalHub, HotelHub, AccessoryShop, TownHall), `MyHome/`, `UserHud/` pages (quests, inventory, abilities, gold).
- `src/app/Console/WorldMap/` one page per region (plains, forest, islands, swamps, mountains, sands, tundra, clouds, moon), each with a shop and a temple link. Weather is a canvas engine in `src/components/organisms/WeatherFX/` (presets per region).
- `src/app/Console/TempleGrounds/` the dungeon screen: a maze of rooms from `src/lib/engine/temples/*.ts` and `templeRegistry.ts`, floors drawn per cell with DOM walls (`TempleWalls.vue`, `templeWalls.ts`), swipe or arrows to move, room behaviour in `src/lib/services/temples/RoomInteractions.ts`, equipped-item use in `ItemUse.ts`, progress in `TempleSystem` / `templeProgress`. It reuses the portal's nav and modals; its ledge also carries `XpVitalsBar` (HP | MP) because there is no HUD in a temple.
- `src/app/Console/BattleField/` battle v2: contract in `docs/Battle-Field-Contract-v2.md`, engine `BattleService.ts` (chores are enemy strikes on a deadline clock), composables `useBattleOutcome/Dialog/Feedback/Audio`, rewards in `battleRewards.ts`; free fights pay AP only; quests needing approval go on hold via `completeQuest(..., "battle")`.
- `src/lib/store/stores/user.ts` is the hero state (stats, HP/MP/GP/XP, equipment, look, inventory) with `persistUser`; `QuestCompletionService` pays rewards; `PlayerStatsService` holds class growth and level-ups (`JOB_CLASS_OPTIONS` in `src/constants`).
- Equipment: the catalogue is `UserHud/components/equipment/EquipmentItems.ts`; hands are shared through `src/hooks/useHeroEquipment.ts`; the voxel hero and My Look live in `src/components/organisms/HeroModel/` and `src/lib/hero-look/`.
- Audio: `src/assets/fx/index.ts` maps sound and BGM slots (per-temple themes, encounter sting) to files rendered by `tools/chiptune/` (numpy synth: `chip.py`, `snes.py` voices, songs in `songs3.py` / `battle_songs.py` / `songs.py`). `src/router/_Guards/bgm.guard.ts` picks music per route and never restarts a playlist already playing.
- Styling: SCSS per page (`_Page.scss` beside the `.ts`), theme in `src/styles/themes/earthbound.scss`, `StatusPlz` font for HUD text, `icon-colors` + Font Awesome duotone (`fad`) icons.

## Conventions

- Pages are `defineComponent` with a sibling `.ts` and `.scss`; new components use `<script setup lang="ts">`.
- Game rules live in pure modules under `src/lib/services/**` with jest specs; screens stay thin.
- Sounds come from `play$fx(key)`; valid keys are the exports of `src/assets/fx/index.ts` (e.g. `select`, `cursor`, `no`, `openMenu`).
- Ionic alerts render HTML (`innerHTMLTemplatesEnabled`); toasts use `cssClass: "rpg-toast"`, position `top`.
- Don't `pkill -f` by command text (it kills the shell); use `lsof -ti:PORT`.
