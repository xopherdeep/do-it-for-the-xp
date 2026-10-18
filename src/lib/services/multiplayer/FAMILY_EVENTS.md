# Family events: the approval loop

The kinds in `familyEvents.ts` (`EVENT_KINDS`) mirror the server's PHP
`Xophz_Compass_Xp_Family_Event_Rules::KINDS` (plugin `xophz-compass-xp`, REST namespace `xp-family/v1`). The
server keeps only the listed `fields`, refuses unknown kinds and refuses a kind its writer may not send. When
the plugin adds a kind, add it to both lists.

Every event is `{ id, heroId, deviceId, kind, at, data }`: `id` a uuid v4 made on the device, `heroId` the
hero the event is about, `at` the ISO time on the device. Events are queued in the outbox
(`eventOutbox.ts`) only when `multiplayerEnabled()` and the device is the family's home device; with the
flag off nothing is queued and the game behaves exactly as before. A hero the site does not know yet (no
`hero.card` sent) sends nothing, since the site would refuse it.

## The three kinds added for the Game Master approval loop

| kind | writer | scope | fields |
| --- | --- | --- | --- |
| `quest.claimed` | home | family | `questId`, `difficulty`, `requiresApproval` |
| `quest.approved` | home | family | `questId`, `note` |
| `quest.rejected` | home | family | `questId`, `note` |

`scope: family` means the hero's own phones and the parent. These carry a quest id, so unlike `quest.done`
they are not shown to the other families in the base.

### `quest.claimed`

- **When:** a hero's claim is logged by `completeQuest()` (`QuestCompletionService.ts`), from the Beast Log, the
  quest card, the task page or a won fight. Game signal: `onQuestClaimed` (`gameSignals.ts`).
- **`questId`:** the quest's id (a string). The quest's name is never sent.
- **`difficulty`:** the quest's difficulty step (1, 2, 3, 5, 8 ...), a positive number.
- **`requiresApproval`:** `true` when the claim is held `pending` for a Game Master, `false` when it was paid at
  once (an honor-system chore, a trusted hour, or a Game Master with no other Game Master to ask, who is
  auto-approved). A paid claim is also followed by `quest.done`.

### `quest.approved` and `quest.rejected`

- **When:** a Game Master settles a held claim through `approveClaim()` / `rejectClaim()` (`approvalFlow.ts`),
  from the Approvals screen. Game signal: `onQuestReviewed`. A claim is settled once, so each claim sends at
  most one of the two; an approval is followed by `quest.done` (the payment).
- **`questId`:** as above.
- **`note`:** the short note the hero read: for a rejection the Game Master's text (trimmed, at most 140
  characters, may be an empty string); for an approval always `""`.
- The reviewer is not sent. Who approved is a device matter (`QuestLogEntry.reviewedBy`).

## Two-phone play: a hero claims on their own phone

The family device (the home) keeps the game and is the only device that pays. A linked hero phone (kid mode, signed
with its hero key, `X-XP-Hero-Key`) shows the hero's sheet and sends claims; the home takes each claim through the same
rules as a claim made on it (`phoneClaimIntake.ts`), and tells the phone what happened. Nothing a phone sends can change
a number on the home, so two devices never hold two versions of a hero.

| kind | writer | scope | fields |
| --- | --- | --- | --- |
| `quest.claimed` | home **or the hero's own phone** | family | `questId`, `difficulty`, `requiresApproval` |
| `hero.sheet` | home | family | `stats`, `quests` |
| `claim.settled` | home | family | `claimId`, `questId`, `status`, `note`, `xp`, `gp`, `ap` |

### What the server has to do (the plugin side, not built yet)

1. **Let a hero key write `quest.claimed`, for its own hero only.** A hero key that sends any other kind, or a claim
   whose `hero_id` is not the key's hero, is rejected (in `rejected`, not a 4xx for the batch). Writer
   `home-or-phone` in `EVENT_KINDS`.
2. **Accept the two new kinds from the parent's auth** (`hero.sheet`, `claim.settled`), family scope, keeping only the
   listed fields. `hero.sheet` carries a `stats` object and a `quests` list of up to 60 objects; allow a body of about
   16 KB per event.
3. **`GET events` with a hero key** returns the events whose `hero_id` is the key's hero (family and public scope),
   after `since`, oldest first, the same paging as the parent's call. The phone reads its sheet and its answers there.
4. **`GET events` with the parent's auth** returns the hero phones' `quest.claimed` too (they are family scope).
5. Dedupe on the event `id` as today: a phone resends a claim whose answer it never read.

### The flow

- **Sheet:** the home sends `hero.sheet` for each hero with a linked phone (the phone list, `GET devices`) when it
  changes: after a claim, a verdict, a profile change, and on each 2-minute download (quests open with the clock).
  `stats` is `{ level, xp, nextLevelXp, gp, ap, hp, maxHp, mp, maxMp }`; each quest is `{ questId, name, difficulty,
  xp, gp, ap, needsApproval, photo, overdue }`. Quest names are family scope only.
- **Claim:** the phone makes a `quest.claimed` (its event id is the claim id), keeps it in its own send queue
  (`HeroPhoneDb`) and sends it; offline, it waits there across restarts.
- **Take:** on download the home takes each `quest.claimed` from another device once (`takenClaims`, and the log entry's
  `phoneClaimId`), dated at the phone's time (no older than a week, never in the future), and answers with
  `claim.settled`: `pending` (held for a Game Master, it lands in Approvals), `approved` (paid at once, with the pay), or
  `rejected` with the line the hero reads (the window is used up, the quest or hero is gone).
- **Verdict:** a Game Master's approval or rejection of a phone claim sends a second `claim.settled` with the pay or the
  note, beside the usual `quest.approved` / `quest.rejected`.
- **Order:** the phone keeps the sheet with the highest `seq` and moves a claim forward only (waiting, pending, then
  approved or rejected), so late or repeated events change nothing.

## Photo proof is local-only today

A chore can ask for a photo when it is claimed (`Achievement.requiresPhoto`). The picture stays on the hero's device (`ClaimPhotoDb`, deleted 7 days after the claim is settled) and is never part of `quest.claimed` or any other event, the outbox or a backup. Uploading one would need a new `claim.photo` kind, server-side storage, and a parent's consent first.

## Rules the server can rely on

- A Game Master's own chore that needs approval is held for ANOTHER Game Master, never self-approved while
  another exists, so `quest.approved` for a Game Master's hero id came from a different Game Master.
- A reject carries the quest back to open for the hero (the hero may claim again), so a `quest.claimed` may
  follow a `quest.rejected` for the same `questId`.
- Delivery is at least once: the outbox retries with a backoff, so the server dedupes on the event `id`.
