/** One tint per class (all at least 4.5:1 on the dark purple), as CSS variables for the class screen. */
const CREST_RGB: Record<string, [number, number, number]> = {
  Warrior: [255, 82, 82],
  Mage: [64, 196, 255],
  Thief: [105, 240, 174],
  Monk: [255, 215, 64],
  Knight: [125, 165, 220],
  Berserker: [230, 45, 60],
  "White Mage": [250, 235, 190],
  "Black Mage": [160, 110, 255],
  Assassin: [150, 165, 188],
  Ranger: [85, 190, 95],
  "Martial Artist": [255, 176, 20],
  Mystic: [35, 200, 188],
  Paladin: [255, 160, 90],
  Ninja: [196, 140, 255],
  Sage: [130, 230, 215],
};

const CREAM: [number, number, number] = [247, 232, 168];

/** `--crest` and `--crest-rgb` for a class, cream for an unknown one. */
export const crestStyle = (name?: string): Record<string, string> => {
  const [r, g, b] = (name && CREST_RGB[name]) || CREAM;
  return { "--crest": `rgb(${r}, ${g}, ${b})`, "--crest-rgb": `${r}, ${g}, ${b}` };
};
