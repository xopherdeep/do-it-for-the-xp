import { CLOUD_BANKS, paintCloudLayer, type CloudLayer } from "@/components/organisms/SceneTransition/effects/cloudSprite";

const SCREEN = { width: 375, height: 812 };
const paintAll = () => CLOUD_BANKS.map((bank) => paintCloudLayer(bank, SCREEN.width, SCREEN.height));

/** The share of a bank's cells that hold cloud, between 0 and 1. Optionally only the cells inside a region. */
const coverage = (layer: CloudLayer, region = { x0: 0, x1: layer.cols, y0: 0, y1: layer.rows }): number => {
  let painted = 0;
  layer.runs.forEach((run) => {
    if (run.y < region.y0 || run.y >= region.y1) return;
    const left = Math.max(run.x, region.x0);
    const right = Math.min(run.x + run.w, region.x1);
    if (right > left) painted += right - left;
  });
  return painted / ((region.x1 - region.x0) * (region.y1 - region.y0));
};

describe("paintCloudLayer", () => {
  it("leaves sky between the clouds, so a bank is never a wall", () => {
    paintAll().forEach((layer) => expect(coverage(layer)).toBeLessThan(0.5));
  });

  it("still paints real clouds, not a scatter of specks", () => {
    paintAll().forEach((layer) => expect(coverage(layer)).toBeGreaterThan(0.2));
  });

  it("spreads the clouds over the whole screen instead of clumping them", () => {
    paintAll().forEach((layer) => {
      for (let col = 0; col < 2; col++)
        for (let row = 0; row < 4; row++) {
          const region = {
            x0: Math.floor((layer.cols * col) / 2),
            x1: Math.floor((layer.cols * (col + 1)) / 2),
            y0: Math.floor((layer.rows * row) / 4),
            y1: Math.floor((layer.rows * (row + 1)) / 4),
          };
          expect(coverage(layer, region)).toBeGreaterThan(0.1);
        }
    });
  });

  it("paints the same bank every time it is flown through", () => {
    expect(paintAll()).toEqual(paintAll());
  });
});
