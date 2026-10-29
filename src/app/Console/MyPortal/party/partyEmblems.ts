/** The emblems a party can carry on its banner (the id is what the site keeps: lower case letters, digits and dashes) */
export const PARTY_EMBLEMS: readonly { id: string; label: string }[] = [
  { id: "dragon", label: "Dragon" },
  { id: "star", label: "Star" },
  { id: "shield", label: "Shield" },
  { id: "sword", label: "Sword" },
  { id: "crown", label: "Crown" },
  { id: "flame", label: "Flame" },
  { id: "moon", label: "Moon" },
  { id: "leaf", label: "Leaf" },
];

/** The hero a Game Master can send into a party: the household's own, and whether it stays home */
export interface HeroChoice {
  id: string;
  name: string;
  staysHome: boolean;
}
