# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Do It For The XP: a gamified family chore app (Vue 3 + Ionic 7 + Pinia + Capacitor, Vue CLI 5 / webpack, TypeScript). Parents are Game Masters (GM) who create quests in the Admin console; kids are heroes who complete them in the Player Portal and earn XP, GP (gold), AP (ability points). The look is SNES-era RPG (Earthbound, LTTP, Chrono Trigger): keep it retro. Data is local (Pinia stores persisted through `src/lib/services/core/StorageService` / localForage); there is no backend in the loop.

## Commands

**Chemical X first.** The owner's `chemx` CLI (and the `chemical-x` MCP tool) wraps every gate and read and prints only what matters. Never run `pnpm typecheck`, `pnpm lint`, `pnpm test` or `pnpm jest` raw: they flood the context. The same goes for subagents: put the chemx commands in their prompts.

```bash
chemx verify                     # audit + typecheck + full tests: CI runs it on every PR, see below; don't run it locally
chemx typecheck                  # errors only
chemx lint                       # ESLint, grouped by file (warnings are tolerated, errors are not)
chemx test tests/unit/Foo.spec.ts   # one spec, failures only (add -t "name" for one test)
chemx read src/foo.ts --outline  # read by outline / symbol / lines instead of cat
chemx q <symbol|text>            # search instead of grep
chemx team task list|claim|done  # the board in .chemx/index.db; lock files with `chemx team lock`
pnpm serve                       # ionic serve, THE dev server on :8100, shared by every session: if `curl -s localhost:8100` answers, use it;
                                 # never start a second one (each costs 2-5 GB and swamps the machine). Only a separate worktree may
                                 # serve its own files, on its own port, and it stops that server when done.
pnpm vue-cli-service test:e2e --headless --url http://localhost:8100 --spec tests/e2e/specs/battle.spec.js
                                 # Cypress 8 against a running server, 390x844; screenshots land in tests/e2e/screenshots
pnpm build                       # ionic build (production uses hash routing and relative publicPath)
pnpm build:compass               # same build into ../Xophz-COMPASS/wp-content/plugins/xophz-compass-xp/public/dist (override with XP_OUTPUT_DIR)
python3 tools/chiptune/render_all.py [song...]   # re-render the chiptune soundtrack into src/assets/audio/chiptune
python3 tools/sfx/door_sfx.py [vault] [stone]   # re-render the bank vault and town hall door foley into src/assets/audio/doors
python3 tools/art/temple_floors.py               # regenerate the procedural temple floor tiles
python3 tools/art/beast_portraits.py -n 2 --style a socktopus   # paint chore beasts from tools/art/beast_roster.json via Gemini (GEMINI_API_KEY);
                                 # --sheet to review, --assign + --install auto|slug=d2 to number them into src/assets/images/beasts, --emit-ts for the library
python3 tools/bgm/master_bgm.py master --upload [name...]  # master produced songs from ~/Downloads WAVs and upload them to R2
```

**The full suite runs on GitHub, not here.** `.github/workflows/tests.yml` runs `chemx verify` (audit, typecheck, every jest spec) and `chemx lint` on each pull request and each push to `master`. Do not run the whole suite locally (no bare `chemx test`, `chemx verify`, `pnpm test` or `pnpm jest` without a spec path): push the branch, open the PR, and read the **Tests** checks (Verify, Lint) instead. While working, run only the spec you are touching (`chemx test tests/unit/Foo.spec.ts`) and `chemx typecheck` / `chemx lint` when you need a quick read. A red check on the PR is the gate: fix it and push again.

Commit small and push to `origin master` when the owner has asked for pushes. The `docs/` folder is a git submodule.

E2E seams: in development `window.__xp` exposes `restoreBackup`, `loginUser`, `getUser`; `cy.seedWorld()` loads `tests/e2e/fixtures/battle-backup.json` and `cy.tapToWakeAudio()` unlocks audio. `three` must be transformed for jest (`tests/jest/esm-transform.js`).

## Architecture

- `src/app/Admin/` GM console: the Compendium (quests = "Achievements", bestiary, abilities, loot), approvals, temple creator.
- `src/app/Console/MyPortal/` the hero's portal shell (`MyPortal.vue/.ts`): an `ion-tabs` outlet, the XP/GP hairline (`XpPurseBar`) at the very top, the HP/MP HUD below it (`UserHud/components/XpMainHud.vue`), and the shared bottom nav (`src/components/organisms/BottomNav/XpBottomNav.vue`: Left hand | Profile | Area | Party | Right hand). Area opens the equipment modal; the avatar menu (`XpFabUserHud`) holds Pegasus and Save & Quit. Sub-areas: `HomeTown/` (GoldBank, HospitalHub, HotelHub, AccessoryShop, TownHall), `MyHome/`, `UserHud/` pages (quests, inventory, abilities, gold).
- `src/app/Console/WorldMap/` one page per region (plains, forest, islands, swamps, mountains, sands, tundra, clouds, moon), each with a shop and a temple link. Weather is a canvas engine in `src/components/organisms/WeatherFX/` (presets per region).
- `src/app/Console/TempleGrounds/` the dungeon screen: a maze of rooms from `src/lib/engine/temples/*.ts` and `templeRegistry.ts`, floors drawn per cell with DOM walls (`TempleWalls.vue`, `templeWalls.ts`), swipe or arrows to move, room behaviour in `src/lib/services/temples/RoomInteractions.ts`, equipped-item use in `ItemUse.ts`, progress in `TempleSystem` / `templeProgress`. It reuses the portal's nav and modals; its header carries `XpPurseBar` (XP | GP) and `XpVitalsBar` (HP | MP) at the very top because there is no HUD in a temple.
- `src/app/Console/BattleField/` battle v2: contract in `docs/Battle-Field-Contract-v2.md`, engine `BattleService.ts` (chores are enemy strikes on a deadline clock), composables `useBattleOutcome/Dialog/Feedback/Audio`, rewards in `battleRewards.ts`; free fights pay AP only; quests needing approval go on hold via `completeQuest(..., "battle")`.
- `src/lib/store/stores/user.ts` is the hero state (stats, HP/MP/GP/XP, equipment, look, inventory) with `persistUser`; `QuestCompletionService` pays rewards; `PlayerStatsService` holds class growth and level-ups (`JOB_CLASS_OPTIONS` in `src/constants`).
- Equipment: the catalogue is `UserHud/components/equipment/EquipmentItems.ts`; hands are shared through `src/hooks/useHeroEquipment.ts`; the voxel hero and My Look live in `src/components/organisms/HeroModel/` and `src/lib/hero-look/`.
- Audio: `src/assets/fx/index.ts` maps sound and BGM slots (per-temple themes, encounter sting) to files rendered by `tools/chiptune/` (numpy synth: `chip.py`, `snes.py` voices, songs in `songs3.py` / `battle_songs.py` / `songs.py`). Most BGM slots now stream produced MP3s from the public R2 bucket `xp-bgm` (`song(name, chiptuneFallback)`, URL in `src/lib/engine/audio/remoteBgm.ts`); `AudioEngine.loadMusic` swaps to the chiptune loop when offline or when the stream errors. A new song: add `song("<slug-of-the-wav-title>", "<fallback>")` to its slot, then `tools/bgm/master_bgm.py master --upload <slug>` trims the silence, evens the loudness (-16 LUFS, peaks under -1 dBTP) and puts the MP3 in the bucket (cached for a year: a changed song needs a new name); a "(Take 2)" is a second song for the same slot, picked at random. `src/router/_Guards/bgm.guard.ts` picks music per route and never restarts a playlist already playing.
- Styling: SCSS per page (`_Page.scss` beside the `.ts`), theme in `src/styles/themes/earthbound.scss`, `StatusPlz` font for HUD text, `icon-colors` + Font Awesome duotone (`fad`) icons.

## Conventions

- Pages are `defineComponent` with a sibling `.ts` and `.scss`; new components use `<script setup lang="ts">`.
- Game rules live in pure modules under `src/lib/services/**` with jest specs; screens stay thin.
- Sounds come from `play$fx(key)`; valid keys are the exports of `src/assets/fx/index.ts` (e.g. `select`, `cursor`, `no`, `openMenu`).
- Ionic alerts render HTML (`innerHTMLTemplatesEnabled`); toasts use `cssClass: "rpg-toast"`, position `middle` (with close button).
- Don't `pkill -f` by command text (it kills the shell); use `lsof -ti:PORT`.
