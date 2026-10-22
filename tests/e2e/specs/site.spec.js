describe("doit front page", () => {
  // Plain http://mycompass is not a secure context, so a plugin script on the local site throws on crypto.randomUUID;
  // that is the site's own script, not the page under test. Any other uncaught error still fails the run.
  Cypress.on("uncaught:exception", (err) => !/randomUUID/.test(err.message));

  const sizes = [["phone", 390, 844], ["desktop", 1280, 800]];
  sizes.forEach(([name, w, h]) => {
    it(`reads at ${name} width`, () => {
      cy.viewport(w, h);
      cy.visit("/");
      cy.get("h1").first().should("contain", "Do It For The XP");
      cy.contains("a", "Play now").should("have.attr", "href", "https://app.doit.forthexp.com");
      cy.contains("a", "How it works").should("have.attr", "href", "#how-it-works");
      cy.get("#how-it-works").should("exist");
      cy.get("iframe.mh-phone-iframe").first().should("have.attr", "src", "https://app.doit.forthexp.com");
      cy.get("img").each(($img) => expect($img.attr("alt"), $img.attr("src")).to.not.be.empty);
      cy.document().then((d) => expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth));
      // The site chrome: the footer override and the fixed Primary Menu, not the theme's terminal block and placeholder links.
      cy.get("footer").should("contain", "GitHub").and("not.contain", "chemx");
      cy.get("#mw-header").should("not.contain", "Portfolio");
      cy.screenshot(`site/front-page-${name}`, { capture: "fullPage" });
      const isDesktop = name === "desktop";
      if (isDesktop) {
        cy.get("nav.mh-desktop-nav").should("contain", "Boards");
      } else {
        cy.get("#mh-hamburger").click();
        cy.get("nav.mh-mobile-nav-body").should("be.visible").and("contain", "Boards");
      }
    });
  });
  it("stays legible in the dark scheme", () => {
    cy.viewport(390, 844);
    cy.wrap(Cypress.automation("remote:debugger:protocol", {
      command: "Emulation.setEmulatedMedia", params: { features: [{ name: "prefers-color-scheme", value: "dark" }] } }));
    cy.visit("/");
    cy.get("h1").first().should("be.visible");
    cy.screenshot("site/front-page-phone-dark", { capture: "fullPage" });
  });
});
