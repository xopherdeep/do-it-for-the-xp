import { defineComponent, h, reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import XpSettingsHome from "@/app/SideMenu/XpSettings/components/XpSettingsHome/XpSettingsHome.vue";

const mockReplace = jest.fn();
jest.mock("vue-router", () => ({ ...jest.requireActual("vue-router"), useRouter: () => ({ replace: mockReplace }) }));

const mockFamily = reactive({
  isKidMode: true,
  device: { heroId: "hero-1", label: "Mia's phone" } as { heroId: string; label: string } | null,
  forgetDevice: jest.fn(),
});
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

const mockSync = { rest: jest.fn() };
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

const calls: string[] = [];
const mockUserStore = { logoutUser: jest.fn() };
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUserStore }));

/** The clerk's dialog, reduced to its lines and one button per choice */
const PromptStub = defineComponent({
  props: ["prompt"],
  emits: ["respond"],
  setup(props, { emit }) {
    return () =>
      props.prompt
        ? h("div", { "data-cy": "prompt" }, [
            h("p", { "data-cy": "prompt-lines" }, props.prompt.options.lines.join(" ")),
            ...props.prompt.options.choices.map((choice: { id: string; label: string }) =>
              h("button", { "data-cy": `prompt-${choice.id}`, onClick: () => emit("respond", { id: choice.id, amount: null }) }, choice.label)
            ),
          ])
        : null;
  },
});

const open = async () => {
  const wrapper = mount(XpSettingsHome, {
    global: {
      stubs: { XpRevealPrompt: PromptStub, XpBackupNudge: { template: "<div data-cy='backup-nudge-stub' />" }, "router-link": true },
    },
  });
  await flushPromises();
  return wrapper;
};

const rowsOf = (wrapper: Awaited<ReturnType<typeof open>>): string[] =>
  wrapper.findAll(".settings-row").map((row) => String(row.attributes("data-test")));

describe("the Settings page", () => {
  beforeEach(() => {
    mockFamily.isKidMode = true;
    mockFamily.device = { heroId: "hero-1", label: "Mia's phone" };
    calls.length = 0;
    mockFamily.forgetDevice.mockReset().mockImplementation(async () => {
      calls.push("forget");
    });
    mockSync.rest.mockReset().mockImplementation(async (heroId: string) => {
      calls.push(`rest:${heroId}`);
    });
    mockUserStore.logoutUser.mockReset().mockImplementation(() => {
      calls.push("logout");
    });
    mockReplace.mockReset().mockImplementation(async (path: string) => {
      calls.push(`replace:${path}`);
    });
  });

  it("on a kid phone lists no Game Master page and ends This device with Unlink this phone", async () => {
    const wrapper = await open();

    const rows = rowsOf(wrapper);
    expect(rows).toEqual(["settings-chore", "settings-reward", "settings-notifications", "settings-sound", "settings-video", "settings-theme", "settings-general", "settings-unlink-phone"]);
    expect(wrapper.find("[data-cy='backup-nudge-stub']").exists()).toBe(false);
  });

  it("on any other device lists the Game Master's pages and no Unlink row", async () => {
    mockFamily.isKidMode = false;
    const wrapper = await open();

    const rows = rowsOf(wrapper);
    expect(rows).toEqual(expect.arrayContaining(["settings-family", "settings-packs", "settings-account"]));
    expect(rows).not.toContain("settings-unlink-phone");
    expect(wrapper.find("[data-cy='backup-nudge-stub']").exists()).toBe(true);
  });

  it("asks before it unlinks, and a Yes rests the hero, forgets the phone, signs the hero out and opens the picker", async () => {
    const wrapper = await open();

    await wrapper.find("[data-test='settings-unlink-phone']").trigger("click");
    expect(wrapper.find("[data-cy='prompt-lines']").text()).toBe("Unlink Mia's phone? It stops working right away.");
    expect(mockSync.rest).not.toHaveBeenCalled();

    await wrapper.find("[data-cy='prompt-yes']").trigger("click");
    await flushPromises();

    expect(calls).toEqual(["rest:hero-1", "forget", "logout", "replace:/xp-profile"]);
  });

  it("dims the row while the hero rests, and a second tap meanwhile asks nothing", async () => {
    let finishRest: () => void = () => undefined;
    mockSync.rest.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRest = resolve;
        })
    );
    const wrapper = await open();
    const row = () => wrapper.find("[data-test='settings-unlink-phone']");
    const isDimmed = (): boolean => Boolean((row().element as unknown as { disabled?: boolean }).disabled);
    expect(isDimmed()).toBe(false);

    await row().trigger("click");
    await wrapper.find("[data-cy='prompt-yes']").trigger("click");
    await flushPromises();
    expect(isDimmed()).toBe(true);

    await row().trigger("click");
    expect(wrapper.find("[data-cy='prompt']").exists()).toBe(false);

    finishRest();
    await flushPromises();
    expect(isDimmed()).toBe(false);
    expect(mockSync.rest).toHaveBeenCalledTimes(1);
  });

  it("keeps the phone linked on No", async () => {
    const wrapper = await open();

    await wrapper.find("[data-test='settings-unlink-phone']").trigger("click");
    await wrapper.find("[data-cy='prompt-no']").trigger("click");
    await flushPromises();

    expect(calls).toEqual([]);
  });
});
