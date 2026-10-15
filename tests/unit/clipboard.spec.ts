import { copyTextToClipboard } from "@/lib/utils/clipboard";

describe("copyTextToClipboard", () => {
  const originalClipboard = navigator.clipboard;
  const originalIsSecureContext = window.isSecureContext;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "isSecureContext", {
      value: originalIsSecureContext,
      writable: true,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  it("uses navigator.clipboard.writeText when in secure context", async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "isSecureContext", {
      value: true,
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard("test code content");
    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith("test code content");
  });

  it("falls back to document.execCommand when navigator.clipboard is undefined (e.g. HTTP LAN context)", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      writable: true,
      configurable: true,
    });

    const mockExecCommand = jest.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    const result = await copyTextToClipboard("sample temple export");
    expect(result).toBe(true);
    expect(mockExecCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false if fallback copy throws or fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      writable: true,
      configurable: true,
    });

    document.execCommand = jest.fn().mockImplementation(() => {
      throw new Error("execCommand denied");
    });

    const result = await copyTextToClipboard("failure case");
    expect(result).toBe(false);
  });
});
