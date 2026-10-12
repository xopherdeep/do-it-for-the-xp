/**
 * The puzzle room: the riddles on the wall and answering one. A right answer unlocks the doors around the
 * room; a wrong one burns.
 */
import type { Room } from '@/lib/engine/core/dungeons/types';
import { hurtHero } from './hero';
import { temples } from './travel';
import { hasHappened, rememberOnce, roomKey } from './visitMemory';
import { SFX } from './vocabulary';
import type { Riddle, RoomContext, RoomOutcome } from './vocabulary';

interface RiddleDef extends Riddle {
  /** Index into choices */
  answer: number;
}

const RIDDLES: Record<string, RiddleDef> = {
  stonePillars: {
    id: 'stonePillars',
    question: 'I stand on no feet and hold up the sky of this room. What am I?',
    choices: ['A shadow', 'A door', 'A pillar'],
    answer: 2,
  },
  prismAlignment: {
    id: 'prismAlignment',
    question: 'I turn one white beam into a rainbow. What am I?',
    choices: ['A candle', 'A prism', 'A mirror'],
    answer: 1,
  },
  shadowReflection: {
    id: 'shadowReflection',
    question: 'I follow you everywhere and vanish in the dark. What am I?',
    choices: ['Your shadow', 'Your echo', 'Your breath'],
    answer: 0,
  },
  waterLevels: {
    id: 'waterLevels',
    question: 'I have a bed but never sleep, and a mouth but never speak. What am I?',
    choices: ['A well', 'A lamp', 'A river'],
    answer: 2,
  },
  fireSequence: {
    id: 'fireSequence',
    question: 'I eat and eat and am always hungry. Give me water and I die. What am I?',
    choices: ['A wolf', 'A fire', 'A moth'],
    answer: 1,
  },
  mirrorIce: {
    id: 'mirrorIce',
    question: 'I show your face but hold no words. Break me and the luck goes with me. What am I?',
    choices: ['A mirror', 'A window', 'A frozen pond'],
    answer: 0,
  },
  generic: {
    id: 'generic',
    question: 'I have keys but open no doors. What am I?',
    choices: ['A map', 'A piano', 'A chest'],
    answer: 1,
  },
};

export const riddleFor = (room: Room): RiddleDef => RIDDLES[String(room.content?.puzzleType)] ?? RIDDLES.generic;

export const publicRiddle = ({ id, question, choices }: RiddleDef): Riddle => ({ id, question, choices: [...choices] });

/** Answer the room's riddle with the index of a choice. */
export const answerRiddle = (room: Room, ctx: RoomContext, choice: number): RoomOutcome => {
  if (hasHappened(roomKey(ctx, 'puzzle'))) return { message: 'The glyphs have faded.' };

  if (choice !== riddleFor(room).answer) {
    const { defeated } = hurtHero(ctx.userId, 3);
    return {
      message: defeated ? 'Wrong. The wall glows hot. You black out.' : 'Wrong. The wall glows hot.',
      sound: SFX.damage,
      shake: true,
      defeated: defeated || undefined,
    };
  }

  rememberOnce(roomKey(ctx, 'puzzle'));
  const opened = temples().openDoorsAround(ctx.templeId, ctx.position, ctx.level);
  return {
    message: opened > 0 ? 'The glyphs fade. A door unlocks.' : 'The glyphs fade. Nothing here was locked.',
    sound: SFX.secret,
  };
};
