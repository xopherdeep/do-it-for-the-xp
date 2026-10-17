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

## Photo proof is local-only today

A chore can ask for a photo when it is claimed (`Achievement.requiresPhoto`). The picture stays on the hero's device (`ClaimPhotoDb`, deleted 7 days after the claim is settled) and is never part of `quest.claimed` or any other event, the outbox or a backup. Uploading one would need a new `claim.photo` kind, server-side storage, and a parent's consent first.

## Rules the server can rely on

- A Game Master's own chore that needs approval is held for ANOTHER Game Master, never self-approved while
  another exists, so `quest.approved` for a Game Master's hero id came from a different Game Master.
- A reject carries the quest back to open for the hero (the hero may claim again), so a `quest.claimed` may
  follow a `quest.rejected` for the same `questId`.
- Delivery is at least once: the outbox retries with a backoff, so the server dedupes on the event `id`.
