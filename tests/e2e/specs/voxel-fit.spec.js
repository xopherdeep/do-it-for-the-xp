// Voxel models inside their views: every three.js camera is fitted to its model's bounds, so nothing is cut off at the
// edge of its canvas. Takes the same pictures before and after a camera change and probes the 2D canvases of the shared
// landmark renderer for pixels on the edge of the canvas (a model that touches the edge is cut off there).
//
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/voxel-fit.spec.js --env phase=before
//
// Pictures (390x844) land in tests/e2e/screenshots/voxel-fit.spec.js/ as voxel-fit-<phase>-<screen>.png, and the edge
// probe as voxel-fit-<phase>-edges.json next to them. `phase` is "before" or "after" (default).
const PHASE = Cypress.env("phase") || "after";
const OUT = "tests/e2e/screenshots/voxel-fit.spec.js";

/** One row per 2D canvas on the page: its size, and how many opaque pixels sit on each of its four edges. */
const probeEdges = (win) => {
  const rows = [];
  win.document.querySelectorAll("canvas").forEach((canvas) => {
    let context = null;
    try {
      context = canvas.getContext("2d");
    } catch (error) {
      context = null;
    }
    if (!context || !canvas.width || !canvas.height) return;
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    const edge = { top: 0, bottom: 0, left: 0, right: 0 };
    let drawn = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Alpha above the 22% shadow disc's faintest rim: only the model itself and its shadow count
        if (data[(y * width + x) * 4 + 3] <= 16) continue;
        drawn++;
        if (y === 0) edge.top++;
        if (y === height - 1) edge.bottom++;
        if (x === 0) edge.left++;
        if (x === width - 1) edge.right++;
      }
    }
    rows.push({ cls: String(canvas.className).slice(0, 24), size: `${width}x${height}`, drawn, ...edge });
  });
  return rows;
};

describe(`Voxel fit (${PHASE})`, () => {
  const edges = {};
  const shot = (name) => cy.screenshot(`voxel-fit-${PHASE}-${name}`, { capture: "viewport", overwrite: true });
  const probe = (name) =>
    cy.window().then((win) => {
      edges[name] = probeEdges(win);
    });

  before(() => {
    cy.seedWorld();
  });

  after(() => {
    cy.writeFile(`${OUT}/voxel-fit-${PHASE}-edges.json`, edges);
  });

  it("Home Town: the buildings and The Plains", () => {
    cy.visit("/my-portal/hero-1/home-town", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get("canvas.building-canvas", { timeout: 60000 }).should("have.length.greaterThan", 3);
    cy.wait(2500);
    probe("hometown");
    shot("01-hometown");
  });

  it("a temple room with a chest, and the chest on its own", () => {
    cy.visit("/temple/wind-temple/hero-1/2/0", { timeout: 120000 });
    cy.get("canvas.room-canvas", { timeout: 60000 }).should("exist");
    cy.wait(2500);
    probe("temple-chest");
    shot("02-temple-chest");
  });

  it("the temple entrance", () => {
    cy.visit("/temple/wind-temple/hero-1", { timeout: 120000 });
    cy.get("canvas.room-canvas", { timeout: 60000 }).should("exist");
    cy.wait(2500);
    probe("temple-entrance");
    shot("03-temple-entrance");
  });

  it("My Look: the lineup's thumbnails, the hero on the stage, and the tallest hat", () => {
    cy.visit("/my-portal/hero-1/my-profile", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-button", /my look/i, { timeout: 30000 }).click({ force: true });
    cy.get("ion-modal.hero-builder [data-cy=starter-hero] img", { timeout: 60000 }).should("have.length", 9);
    cy.wait(1000);
    shot("04-lineup");

    cy.get("[data-cy=starter-hero]").first().click({ force: true });
    cy.get("ion-modal.hero-builder canvas", { timeout: 60000 }).should("exist");
    cy.get("[data-cy=builder-done]", { timeout: 20000 }).should("be.visible");
    cy.wait(1500);
    shot("05-editor");

    cy.contains("ion-modal.hero-builder button[role=tab]", /^\s*Hat\s*$/).click({ force: true });
    cy.get("[data-cy=look-tile][data-option=wizard]", { timeout: 20000 }).click({ force: true });
    cy.wait(1200);
    shot("06-wizard-hat");
  });
});
