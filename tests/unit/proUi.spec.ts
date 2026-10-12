import { proToast } from "@/lib/services/pro/proUi";

const mockPresent = jest.fn(async () => undefined);
const mockCreate = jest.fn(async (_opts: Record<string, unknown>) => ({ present: mockPresent }));
jest.mock("@ionic/vue", () => ({
  __esModule: true,
  toastController: { create: (opts: Record<string, unknown>) => mockCreate(opts) },
  modalController: { create: jest.fn() },
}));

describe("proToast", () => {
  it("is an RPG toast in the middle of the screen with a close button", async () => {
    await proToast("XP Pro restored!", "success");
    const opts = mockCreate.mock.calls[0][0] as any;
    expect(opts).toMatchObject({ message: "XP Pro restored!", position: "middle", cssClass: "rpg-toast", color: "success" });
    expect(opts.buttons).toEqual([{ text: "Close", role: "cancel" }]);
    expect(mockPresent).toHaveBeenCalled();
  });
});
