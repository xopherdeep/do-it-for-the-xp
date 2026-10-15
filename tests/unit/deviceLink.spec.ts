import {
  CODE_ALPHABET,
  formatCode,
  linkUrl,
  normalizeCode,
  phoneLabel,
  readLink,
} from "@/lib/services/multiplayer/deviceLink";

describe("deviceLink", () => {
  describe("CODE_ALPHABET", () => {
    it("has 31 characters without ambiguous letters", () => {
      expect(CODE_ALPHABET).toBe("ABCDEFGHJKMNPQRSTUVWXYZ23456789");
      expect(CODE_ALPHABET).toHaveLength(31);
      expect(CODE_ALPHABET).not.toContain("0");
      expect(CODE_ALPHABET).not.toContain("O");
      expect(CODE_ALPHABET).not.toContain("1");
      expect(CODE_ALPHABET).not.toContain("I");
      expect(CODE_ALPHABET).not.toContain("L");
    });
  });

  describe("normalizeCode", () => {
    it("accepts typed codes with spaces and hyphens", () => {
      expect(normalizeCode("abcd efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("ABCD-EFGH")).toBe("ABCDEFGH");
      expect(normalizeCode(" ab cd ef gh ")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd-efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("ABCDEFGH\n")).toBe("ABCDEFGH");
    });

    it("strips no-break spaces and Unicode dashes", () => {
      expect(normalizeCode("abcd\u00A0efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2010efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2011efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2012efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2013efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2014efgh")).toBe("ABCDEFGH");
      expect(normalizeCode("abcd\u2015efgh")).toBe("ABCDEFGH");
    });

    it("refuses codes with forbidden characters or wrong length", () => {
      expect(normalizeCode("ABCDEFG0")).toBeNull();
      expect(normalizeCode("ABCDEFG1")).toBeNull();
      expect(normalizeCode("ABCDEFGO")).toBeNull();
      expect(normalizeCode("ABCD-EFGI")).toBeNull();
      expect(normalizeCode("ABCD-EFGL")).toBeNull();
      expect(normalizeCode("ABCDEFG")).toBeNull();
      expect(normalizeCode("ABCDEFGHJ")).toBeNull();
      expect(normalizeCode("")).toBeNull();
      expect(normalizeCode("----")).toBeNull();
    });
  });

  describe("formatCode", () => {
    it("formats 8 characters with a hyphen in the middle", () => {
      expect(formatCode("ABCDEFGH")).toBe("ABCD-EFGH");
    });
  });

  describe("linkUrl", () => {
    it("builds a hash mode link URL", () => {
      const url = linkUrl("ABCDEFGH", { origin: "https://app.forthexp.com", pathname: "/" }, true);
      expect(url).toBe("https://app.forthexp.com/#/link?code=ABCDEFGH");
    });

    it("builds a path mode link URL", () => {
      const url = linkUrl("ABCDEFGH", { origin: "https://app.forthexp.com", pathname: "/" }, false);
      expect(url).toBe("https://app.forthexp.com/link?code=ABCDEFGH");
    });

    it("includes site parameter when provided", () => {
      const url = linkUrl("ABCDEFGH", { origin: "https://app.forthexp.com", pathname: "/" }, true, "http://localhost:8090");
      expect(url).toBe("https://app.forthexp.com/#/link?code=ABCDEFGH&site=http%3A%2F%2Flocalhost%3A8090");
    });
  });

  describe("readLink", () => {
    it("reads code from hash query", () => {
      const parsed = readLink("https://app.forthexp.com/#/link?code=ABCDEFGH", true);
      expect(parsed).toEqual({ code: "ABCDEFGH" });
    });

    it("reads code from search query", () => {
      const parsed = readLink("https://app.forthexp.com/link?code=ABCDEFGH", true);
      expect(parsed).toEqual({ code: "ABCDEFGH" });
    });

    it("keeps site in development", () => {
      const parsed = readLink("https://app.forthexp.com/#/link?code=abcd-efgh&site=http://localhost:8090", false);
      expect(parsed).toEqual({ code: "ABCDEFGH", site: "http://localhost:8090" });
    });

    it("drops site in production", () => {
      const parsed = readLink("https://app.forthexp.com/#/link?code=abcd-efgh&site=http://localhost:8090", true);
      expect(parsed).toEqual({ code: "ABCDEFGH" });
    });

    it("returns null for invalid codes", () => {
      expect(readLink("https://app.forthexp.com/link?code=ABCDEFG0", false)).toBeNull();
      expect(readLink("https://app.forthexp.com/link", false)).toBeNull();
    });
  });

  describe("phoneLabel", () => {
    it("labels ios platform", () => {
      expect(phoneLabel("Mia", "", "ios")).toBe("Mia's iPhone");
    });

    it("labels android platform", () => {
      expect(phoneLabel("Mia", "", "android")).toBe("Mia's Android");
    });

    it("labels web user agents", () => {
      expect(phoneLabel("Mia", "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)", "web")).toBe("Mia's iPhone");
      expect(phoneLabel("Mia", "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)", "web")).toBe("Mia's iPad");
      expect(phoneLabel("Mia", "Mozilla/5.0 (Linux; Android 12; Pixel 6)", "web")).toBe("Mia's Android");
      expect(phoneLabel("Mia", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "web")).toBe("Mia's Windows PC");
      expect(phoneLabel("Mia", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "web")).toBe("Mia's Mac");
      expect(phoneLabel("Mia", "Mozilla/5.0 (X11; Linux x86_64)", "web")).toBe("Mia's Linux");
      expect(phoneLabel("Mia", "CustomBrowser/1.0", "web")).toBe("Mia's phone");
    });
  });
});
