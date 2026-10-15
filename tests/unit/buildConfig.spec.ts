// The legacy Sass path avoids loading sass-embedded (its ESM deps do not resolve under jest).
process.env.XP_SASS_MODERN = "0";
const config = require("../../vue.config.js");
describe("production build config", () => {
  it("never emits source maps", () => {
    expect(config.productionSourceMap).toBe(false);
  });
});
