/**
 * Helper to identify if a token is a wall
 */
export const isWallToken = (token: string) =>
  token === '____' || // Standard 4-char wall
  token === '_____' || // 5-char wall (temple-creator store format)
  token === 'WALL' || // Legacy literal
  token === '_';      // Legacy single char

/**
 * Helper to identify if a token is an entrance/exit
 */
export const isEntranceToken = (token: string) =>
  token === '_00_' || // Standard entrance token
  token === '_00__' || // 5-char entrance token (temple-creator store)
  token === 'EXIT' || // DSL entrance/exit
  token === 'E';      // Legacy single char
