/**
 * The look catalogue: every wearable piece the Hero Builder can show, with its name and where it comes from.
 * Class outfits (three per class, at class level 1, 5 and 10) are checked against the spec's name table.
 */
import { JOB_CLASS_OPTIONS } from "@/constants";
import {
  CLASS_OUTFIT_STYLES,
  LOOK_CATALOG,
  STARTER_OUTFIT_STYLES,
  classOutfitPieces,
  classSlug,
  pieceById,
  piecesForSlot,
} from "@/lib/hero-look/catalog";
import { LOOK_COLORS, OUTFIT_STYLES } from "@/lib/hero-look/types";

const outfitPieces = () => LOOK_CATALOG.filter((piece) => piece.slot === "outfit");

describe("look catalogue", () => {
  it("has one outfit piece per OutfitStyle value and 53 outfit pieces in all", () => {
    const values = outfitPieces().map((piece) => piece.value);
    expect(values).toHaveLength(53);
    expect(new Set(values).size).toBe(53);
    expect(STARTER_OUTFIT_STYLES).toHaveLength(8);
    expect(CLASS_OUTFIT_STYLES).toHaveLength(45);
    expect([...STARTER_OUTFIT_STYLES, ...CLASS_OUTFIT_STYLES].sort()).toEqual([...values].sort());
    expect([...OUTFIT_STYLES]).toEqual(STARTER_OUTFIT_STYLES);
  });

  it("gives every class in JOB_CLASS_OPTIONS three pieces at levels 1, 5 and 10 with the spec's names", () => {
    for (const { name } of JOB_CLASS_OPTIONS) {
      const pieces = classOutfitPieces(name);
      expect(pieces).toHaveLength(3);
      expect(pieces.map((piece) => piece.source)).toEqual([1, 5, 10].map((level) => ({ kind: "class", jobClass: name, level })));
    }
    expect(classOutfitPieces("Warrior").map((piece) => piece.name)).toEqual(["Leather Jerkin", "Chainmail Hauberk", "Battle Plate"]);
    expect(classOutfitPieces("Sage").map((piece) => piece.name)).toEqual(["Scholar's Robe", "Sage's Vestments", "Worldtree Mantle"]);
    expect(classOutfitPieces("Not A Class")).toEqual([]);
  });

  it("ids are outfit:<slug>-<level> and unique", () => {
    expect(classSlug("White Mage")).toBe("white-mage");
    expect(classSlug("Martial Artist")).toBe("martial-artist");
    expect(classSlug("Warrior")).toBe("warrior");
    expect(pieceById("outfit:white-mage-5")?.name).toBe("White Robe");
    expect(pieceById("outfit:martial-artist-10")?.name).toBe("Dragon Gi");
    const ids = LOOK_CATALOG.map((piece) => piece.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const piece of LOOK_CATALOG) expect(piece.id).toBe(`${piece.slot}:${piece.value}`);
    for (const piece of LOOK_CATALOG.filter((p) => p.source.kind === "class")) {
      expect(piece.id).toMatch(/^outfit:[a-z]+(-[a-z]+)?-(1|5|10)$/);
    }
  });

  it("every class piece carries a colour pair from LOOK_COLORS", () => {
    const classPieces = LOOK_CATALOG.filter((piece) => piece.source.kind === "class");
    expect(classPieces).toHaveLength(45);
    for (const piece of classPieces) {
      expect(LOOK_COLORS).toContain(piece.colors?.outfitColor);
      expect(LOOK_COLORS).toContain(piece.colors?.outfitAccent);
    }
    expect(pieceById("outfit:warrior-1")?.colors).toEqual({ outfitColor: "#b8342b", outfitAccent: "#8d8d8d" });
    expect(pieceById("outfit:sage-10")?.colors).toEqual({ outfitColor: "#2b8a8a", outfitAccent: "#e8d5a8" });
    // the three outfits of a class share one palette
    for (const { name } of JOB_CLASS_OPTIONS) {
      const pairs = classOutfitPieces(name).map((piece) => JSON.stringify(piece.colors));
      expect(new Set(pairs).size).toBe(1);
    }
  });

  it("piecesForSlot(\"outfit\") lists the eight starters first, then classes in JOB_CLASS_OPTIONS order", () => {
    const outfits = piecesForSlot("outfit");
    expect(outfits.slice(0, 8).map((piece) => piece.value)).toEqual(STARTER_OUTFIT_STYLES);
    expect(outfits.slice(0, 8).every((piece) => piece.source.kind === "starter")).toBe(true);
    const expectedClassValues = JOB_CLASS_OPTIONS.flatMap(({ name }) => classOutfitPieces(name).map((piece) => piece.value));
    expect(outfits.slice(8).map((piece) => piece.value)).toEqual(expectedClassValues);
    expect(CLASS_OUTFIT_STYLES).toEqual(expectedClassValues);
  });

  it("pieceById returns undefined for an unknown id", () => {
    expect(pieceById("outfit:nope-3")).toBeUndefined();
    expect(pieceById("")).toBeUndefined();
    expect(pieceById("hat:tunic")).toBeUndefined();
  });

  it("holds a starter piece for every hair, face, hat and colour option", () => {
    expect(piecesForSlot("hair")).toHaveLength(10);
    expect(piecesForSlot("face")).toHaveLength(6);
    expect(piecesForSlot("hat")).toHaveLength(9);
    expect(piecesForSlot("color").map((piece) => piece.value)).toEqual(LOOK_COLORS);
    const everyStarter = LOOK_CATALOG.filter((piece) => piece.slot !== "outfit" || piece.source.kind === "starter");
    expect(everyStarter.every((piece) => piece.source.kind === "starter")).toBe(true);
    expect(pieceById("hat:wizard")?.name).toBe("Wizard Hat");
    expect(pieceById("color:#b8342b")?.slot).toBe("color");
  });
});
