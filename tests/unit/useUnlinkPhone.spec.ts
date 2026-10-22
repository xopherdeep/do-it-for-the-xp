import { reactive } from "vue";
import { useUnlinkPhone } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/useUnlinkPhone";

const mockReplace = jest.fn();

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
  const unlink = useUnlinkPhone({ replace: mockReplace });
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
    mockReplace.mockReset().mockImplementation(async (path: string) => {
      calls.push(`replace:${path}`);
    });
  });

  it("asks in the clerk's words which phone, then rests the hero, forgets the device and opens the picker, in that order", async () => {
    const { asked } = await unlinkAnswering("yes");

    expect(asked).toBe("Unlink Mia's phone? It stops working right away.");
    expect(calls).toEqual(["rest:hero-1", "forget", "replace:/xp-profile"]);
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
});
