/** Each temple element's glow: banners, dust and light in the temple take this colour. */
const GLOWS: Record<string, string> = {
  wind: "#fff2d0",
  fire: "#ff7828",
  ice: "#bfe6ff",
  water: "#7fe0ea",
  earth: "#b4d26e",
  light: "#ffe9a0",
  shadow: "#b48cff",
  moon: "#dcdcff",
  storm: "#ffe45c",
};

export const templeGlow = (element?: string): string => GLOWS[element ?? "wind"] ?? GLOWS.wind;
