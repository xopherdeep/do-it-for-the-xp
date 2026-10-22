import { reactive } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useUnlinkPhone } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/useUnlinkPhone";

const mockReplace = jest.fn();
const mockSignOut = jest.fn();

const calls: string[] = [];

const mockFamily = reactive({
  device: { heroId: "hero-1", label: "Mia's phone" } as { heroId: string; label: string } | null,
  forgetDevice: jest.fn(),
});
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

const mockSync = { rest: jest.fn() };
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

/** Starts the Unlink row's job and answers the clerk's question with `choice` once it is up */
const unlinkAnswering = async (choice: "yes" | "no") => {
  const unlink = useUnlinkPhone({ replace: mockReplace }, mockSignOut);
  const done = unlink.unlinkThisPhone();
  const asked = unlink.prompt.value?.options.lines.join(" ") ?? null;
  if (unlink.prompt.value) unlink.respond({ id: choice, amount: null });
  await done;
  return { asked };
};

describe("Unlink this phone (the Settings row on a kid phone)", () => {
  beforeEach(() => {
    calls.length = 0;
    mockFamily.device = { heroId: "hero-1", label: "Mia's phone" };
    mockFamily.forgetDevice.mockReset().mockImplementation(async () => {
      calls.push("forget");
    });
    mockSync.rest.mockReset().mockImplementation(async (heroId: string) => {
      calls.push(`rest:${heroId}`);
    });
    mockSignOut.mockReset().mockImplementation(() => {
      calls.push("logout");
    });
    mockReplace.mockReset().mockImplementation(async (path: string) => {
      calls.push(`replace:${path}`);
    });
  });

  it("asks in the clerk's words which phone, then rests the hero, forgets the device, signs the hero out and opens the picker, in that order", async () => {
    const { asked } = await unlinkAnswering("yes");

    expect(asked).toBe("Unlink Mia's phone? It stops working right away.");
    expect(calls).toEqual(["rest:hero-1", "forget", "logout", "replace:/xp-profile"]);
  });

  it("leaves the phone linked and the hero playing when the answer is No", async () => {
    await unlinkAnswering("no");

    expect(calls).toEqual([]);
  });

  it("does nothing, and asks nothing, on a phone that is not linked", async () => {
    mockFamily.device = null;
    const { asked } = await unlinkAnswering("yes");

    expect(asked).toBeNull();
    expect(calls).toEqual([]);
  });

  it("shows the row as busy from the tap until the phone is unlinked, and a second tap meanwhile does nothing", async () => {
    let finishRest: () => void = () => undefined;
    mockSync.rest.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          calls.push("rest:hero-1");
          finishRest = resolve;
        })
    );
    const unlink = useUnlinkPhone({ replace: mockReplace }, mockSignOut);
    expect(unlink.isUnlinking.value).toBe(false);

    const first = unlink.unlinkThisPhone();
    expect(unlink.isUnlinking.value).toBe(true);
    unlink.respond({ id: "yes", amount: null });
    await flushPromises();
    await unlink.unlinkThisPhone();
    expect(unlink.prompt.value).toBeNull();

    finishRest();
    await first;

    expect(calls).toEqual(["rest:hero-1", "forget", "logout", "replace:/xp-profile"]);
    expect(unlink.isUnlinking.value).toBe(false);
  });

  it("stays linked and signed in, and frees the row, when the hero cannot be rested or the phone cannot forget", async () => {
    mockFamily.forgetDevice.mockRejectedValue(new Error("disk full"));
    const unlink = useUnlinkPhone({ replace: mockReplace }, mockSignOut);

    const done = unlink.unlinkThisPhone();
    unlink.respond({ id: "yes", amount: null });
    await expect(done).resolves.toBeUndefined();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(unlink.isUnlinking.value).toBe(false);
  });
});
