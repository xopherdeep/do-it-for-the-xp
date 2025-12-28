/**
 * Abbreviates a number into a shorter string (e.g., 1000 -> 1k, 1000000 -> 1M)
 * @param value The number to abbreviate
 * @param decimals Number of decimal places to show
 * @returns A string representing the abbreviated number
 */
export function abbreviateNumber(value: number, decimals: number = 0): string {
  if (value === null || value === undefined) return '0';
  if (isNaN(value)) return '0';
  
  const suffixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
  const tier = (Math.log10(Math.abs(value)) / 3) | 0;

  if (tier === 0) return value.toString();

  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = value / scale;

  const result = scaled.toFixed(decimals);
  return (parseFloat(result).toString()) + suffix;
}

/**
 * Formats a currency value
 * @param value The number to format
 * @returns A formatted string
 */
export function formatCurrency(value: number): string {
  if (value >= 10000) {
    return abbreviateNumber(value, 1);
  }
  return value.toLocaleString();
}
