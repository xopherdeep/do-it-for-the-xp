// Route params arrive as strings ("0" included). Only a complete, numeric x/y pair is a start position.
const isBlankParam = (value: unknown): boolean => value === undefined || value === null || value === '';

export const toStartPosition = (x: unknown, y: unknown): [number, number] | undefined => {
  const isStartIncomplete = isBlankParam(x) || isBlankParam(y);
  if (isStartIncomplete) return undefined;
  const col = Number(x);
  const row = Number(y);
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 ? [row, col] : undefined;
};

// The temple route has no :level segment: a battle returns with ?level=2F. A floor only means something
// next to the start position it qualifies, and the temple ignores floors it does not have.
export const toStartLevel = (level: unknown, startPosition: [number, number] | undefined): string | undefined => {
  const raw = Array.isArray(level) ? level[0] : level;
  return startPosition && typeof raw === 'string' && raw !== '' ? raw : undefined;
};
