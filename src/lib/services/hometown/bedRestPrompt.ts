/**
 * The question the hero's own bed asks before a night's rest at home: the game's dialog (the bed rising), not a native
 * alert. The quote (Lodging.quoteBedRest) decides whether the hero can rest at all; this is only the asking.
 */
import { yesNoOf, type RevealPromptOptions } from '@/components/organisms/RevealPrompt/revealPrompt';
import { copyFor } from '@/lib/services/copy/copy';
import type { Voice } from '@/lib/services/copy/voices';

/** The name over the dialog, the same as the bed's label on the My Home screen. */
export const BED = 'Cozy Bed';

/** Rest in Bed: restore all HP and MP, once a day. Yes rests (`yes`), Escape or Not now backs out (`no`). */
export const bedRestConfirmPrompt = (voice: Voice = 'adventure'): RevealPromptOptions =>
  yesNoOf(BED, copyFor('home.bed.confirm', voice), { yes: 'Rest', no: 'Not now', yesIcon: 'moon' }, { sprite: 'bed' });
