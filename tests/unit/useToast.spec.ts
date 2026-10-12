/**
 * The toast hook: every toast is an RPG message box (dark panel, X to dismiss, swipe to dismiss).
 * "@ionic/vue" is mocked, so the specs run without any web components.
 */

const mockPresent = jest.fn();
const mockCreate = jest.fn();

jest.mock("@ionic/vue", () => ({
  __esModule: true,
  toastController: {
    create: (options: unknown) => mockCreate(options),
  },
}));

import { rpgToastOptions, useToast } from "@/hooks/useToast";

describe("rpgToastOptions", () => {
  it("builds the RPG box with a cancel X, the position and the duration", () => {
    const options = rpgToastOptions("x", 1500, "bottom");

    expect(options.message).toBe("x");
    expect(options.cssClass).toBe("rpg-toast");
    expect(options.position).toBe("bottom");
    expect(options.duration).toBe(1500);
    expect(options.color).toBeUndefined();
    expect(options.buttons).toHaveLength(1);
    expect(options.buttons?.[0]).toEqual(
      expect.objectContaining({ role: "cancel", side: "end", htmlAttributes: { "aria-label": "Dismiss" } })
    );
    expect(options.buttons?.[0]).toHaveProperty("icon");
  });

  it("can be swiped away vertically (Ionic 7.8 supports swipeGesture)", () => {
    expect(rpgToastOptions("x", 1500, "bottom").swipeGesture).toBe("vertical");
  });

  it("defaults to two seconds in the center", () => {
    const options = rpgToastOptions("hello");

    expect(options.duration).toBe(2000);
    expect(options.position).toBe("middle");
  });
});

describe("useToast", () => {
  beforeEach(() => {
    mockPresent.mockReset().mockResolvedValue(undefined);
    mockCreate.mockReset().mockResolvedValue({ present: mockPresent });
  });

  it("defaults to presenting in the center with close button", async () => {
    const { showToast } = useToast();

    await showToast("A door creaks open");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: "A door creaks open", duration: 2000, position: "middle", cssClass: "rpg-toast" })
    );
    expect(mockPresent).toHaveBeenCalledTimes(1);
  });

  it("presents one RPG toast, whatever colour the caller asks for", async () => {
    const { showToast } = useToast();

    const toast = await showToast("A door creaks open", 2400, "bottom", "danger");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: "A door creaks open", duration: 2400, position: "bottom", cssClass: "rpg-toast" })
    );
    expect(mockCreate.mock.calls[0][0].color).toBeUndefined();
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(toast).toEqual({ present: mockPresent });
  });
});
