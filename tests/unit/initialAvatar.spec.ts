/**
 * Local initial avatars: the hero picker's fallback is drawn on the device, so a child's name is never
 * sent to a third-party avatar service.
 */

import { initialAvatar } from "@/lib/utils/initialAvatar";

const svgOf = (uri: string) => decodeURIComponent(uri.replace("data:image/svg+xml;charset=utf-8,", ""));

describe("initialAvatar", () => {
  it("is a local SVG data URI, never a network URL", () => {
    const uri = initialAvatar("Emma");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(uri).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(svgOf(uri)).not.toContain("Emma");
  });

  it("draws the first letter, upper-cased", () => {
    expect(svgOf(initialAvatar("emma"))).toContain(">E</text>");
    expect(svgOf(initialAvatar("  zed "))).toContain(">Z</text>");
  });

  it("falls back to H for a missing or blank name", () => {
    expect(svgOf(initialAvatar(undefined))).toContain(">H</text>");
    expect(svgOf(initialAvatar(null))).toContain(">H</text>");
    expect(svgOf(initialAvatar("   "))).toContain(">H</text>");
  });

  it("keeps the same colour for the same name", () => {
    expect(initialAvatar("Milo")).toBe(initialAvatar("Milo"));
  });

  it("escapes markup in the initial", () => {
    const svg = svgOf(initialAvatar("<script>"));
    expect(svg).toContain(">&lt;</text>");
    expect(svg).not.toContain("<script");
  });

  it("keeps a whole emoji as the initial", () => {
    expect(svgOf(initialAvatar("🐉 Drake"))).toContain(">🐉</text>");
  });
});
