import { SKY_BANDS, skyBands, skyGradient } from "@/components/organisms/SceneTransition/effects/skyBands";

const ELEMENTS = ["wind", "fire", "ice", "water", "earth", "light", "shadow", "storm", "moon"];
const HEX = /^#[0-9a-f]{6}$/;

/** Rec. 601 luma, 0 to 255: enough to tell a darker band from a lighter one. */
const luma = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

describe("skyBands", () => {
  it("paints a handful of flat bands, as hex colours", () => {
    const bands = skyBands();
    expect(bands).toHaveLength(SKY_BANDS);
    bands.forEach((band) => expect(band).toMatch(HEX));
    expect(new Set(bands).size).toBe(SKY_BANDS);
  });

  it("runs from a deep sky at the top to a pale horizon at the bottom, for every element", () => {
    [undefined, ...ELEMENTS].forEach((element) => {
      const lumas = skyBands(element).map(luma);
      lumas.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(lumas[i]));
    });
  });

  it("falls back to the plain blue for no element and for an unknown one", () => {
    expect(skyBands(undefined)).toEqual(skyBands("sparkles"));
  });

  it("gives every element its own sky", () => {
    const skies = [undefined, ...ELEMENTS].map((element) => skyBands(element).join());
    expect(new Set(skies).size).toBe(skies.length);
  });
});

describe("skyGradient", () => {
  it("is a top-to-bottom gradient with a hard edge between bands, so it reads as pixel art", () => {
    const css = skyGradient("fire");
    expect(css.startsWith("linear-gradient(to bottom,")).toBe(true);
    skyBands("fire").forEach((band) => expect(css.split(band).length - 1).toBe(2));
    expect(css).toContain("0%");
    expect(css).toContain("100%");
  });
});
