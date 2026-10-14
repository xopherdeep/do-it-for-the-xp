import { toFaClass } from "@/lib/utils/faIcon";

describe("toFaClass", () => {
  it("turns a bare name into its Font Awesome class", () => {
    expect(toFaClass("bolt")).toBe("fa-bolt");
    expect(toFaClass("hand-holding-magic")).toBe("fa-hand-holding-magic");
  });

  it("keeps a name that already starts with fa-", () => {
    expect(toFaClass("fa-bolt")).toBe("fa-bolt");
    expect(toFaClass("fa-hand-holding-magic")).toBe("fa-hand-holding-magic");
  });

  it("does not mistake a bare name that merely begins with fa for the prefixed spelling", () => {
    expect(toFaClass("face-smile")).toBe("fa-face-smile");
    expect(toFaClass("fan")).toBe("fa-fan");
  });

  it("ignores stray spaces around the name", () => {
    expect(toFaClass("  bolt ")).toBe("fa-bolt");
    expect(toFaClass(" fa-bolt")).toBe("fa-bolt");
  });

  it("gives the fallback (empty by default) when there is no name", () => {
    expect(toFaClass("")).toBe("");
    expect(toFaClass("   ")).toBe("");
    expect(toFaClass(undefined)).toBe("");
    expect(toFaClass(null)).toBe("");
    expect(toFaClass("", "fa-sparkles")).toBe("fa-sparkles");
    expect(toFaClass(undefined, "fa-sparkles")).toBe("fa-sparkles");
  });

  it("does not use the fallback when there is a name", () => {
    expect(toFaClass("bolt", "fa-sparkles")).toBe("fa-bolt");
    expect(toFaClass("fa-bolt", "fa-sparkles")).toBe("fa-bolt");
  });
});
