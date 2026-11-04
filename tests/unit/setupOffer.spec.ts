import { offerSetupOnce, openSetupWizard, resetSetupOfferForTests } from "@/app/SideMenu/SetupWizard/useSetupOffer";
import { modalController } from "@ionic/vue";
import { isGameEmpty, setupBlocked } from "@/lib/services/setup/runSetup";

jest.mock("@/app/SideMenu/SetupWizard/SetupWizard.vue", () => ({ __esModule: true, default: {} }));
jest.mock("@ionic/vue", () => ({ modalController: { create: jest.fn() } }));
jest.mock("@/lib/services/setup/runSetup", () => ({ isGameEmpty: jest.fn(), setupBlocked: jest.fn() }));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { error: jest.fn() } }));

const createMock = modalController.create as unknown as jest.Mock;
const emptyMock = isGameEmpty as unknown as jest.Mock;
const blockedMock = setupBlocked as unknown as jest.Mock;

const fakeModal = (data?: { done: boolean; heroCount?: number }) => ({
  present: jest.fn().mockResolvedValue(undefined),
  onDidDismiss: jest.fn().mockResolvedValue({ data }),
});

describe("setup offer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSetupOfferForTests();
    blockedMock.mockResolvedValue(null);
  });

  it("stays quiet when a Game Master exists and this person cannot manage the family", async () => {
    emptyMock.mockResolvedValue(true);
    blockedMock.mockResolvedValue("Only a Game Master can run setup.");
    expect(await offerSetupOnce()).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("resets the session flag and returns null when the check throws", async () => {
    emptyMock.mockRejectedValueOnce(new Error("storage down")).mockResolvedValue(true);
    createMock.mockResolvedValue(fakeModal({ done: false }));
    expect(await offerSetupOnce()).toBeNull();
    expect(await offerSetupOnce()).not.toBeNull();
  });

  it("openSetupWizard returns the dismiss data, or a not-done default", async () => {
    createMock.mockResolvedValueOnce(fakeModal({ done: true, heroCount: 3 }));
    expect(await openSetupWizard()).toEqual({ done: true, heroCount: 3 });
    createMock.mockResolvedValueOnce(fakeModal(undefined));
    expect(await openSetupWizard()).toEqual({ done: false, heroCount: 0 });
  });

  it("offers the wizard when the game is empty", async () => {
    emptyMock.mockResolvedValue(true);
    createMock.mockResolvedValue(fakeModal({ done: true, heroCount: 2 }));
    expect(await offerSetupOnce()).toEqual({ done: true, heroCount: 2 });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("does not offer when the game is not empty", async () => {
    emptyMock.mockResolvedValue(false);
    expect(await offerSetupOnce()).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("offers only once a session, even when the first run was skipped", async () => {
    emptyMock.mockResolvedValue(true);
    createMock.mockResolvedValue(fakeModal({ done: false }));
    expect((await offerSetupOnce())?.done).toBe(false);
    expect(await offerSetupOnce()).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("opens one wizard for two overlapping offers", async () => {
    emptyMock.mockResolvedValue(true);
    createMock.mockResolvedValue(fakeModal({ done: true, heroCount: 1 }));
    const [a, b] = await Promise.all([offerSetupOnce(), offerSetupOnce()]);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it("can offer again after a not-empty check", async () => {
    emptyMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    createMock.mockResolvedValue(fakeModal({ done: false }));
    expect(await offerSetupOnce()).toBeNull();
    expect(await offerSetupOnce()).not.toBeNull();
  });

  it("shares an open wizard between two openSetupWizard calls, then opens a fresh one", async () => {
    createMock.mockResolvedValue(fakeModal({ done: true, heroCount: 2 }));
    const [a, b] = await Promise.all([openSetupWizard(), openSetupWizard()]);
    expect(a).toEqual(b);
    expect(createMock).toHaveBeenCalledTimes(1);
    await openSetupWizard();
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
