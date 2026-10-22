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
    mockFamily.forgetDevice.mockReset().mockResolvedValue(undefined);
    mockSync.rest.mockReset().mockResolvedValue(undefined);
    mockReplace.mockReset();
  });

  it("on a kid phone lists no Game Master page and ends This device with Unlink this phone", async () => {
    const wrapper = await open();

    const rows = rowsOf(wrapper);
    expect(rows).toEqual(["settings-chore", "settings-reward", "settings-notifications", "settings-sound", "settings-theme", "settings-general", "settings-unlink-phone"]);
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

  it("asks before it unlinks, and a Yes rests the hero, forgets the phone and opens the picker", async () => {
    const wrapper = await open();

    await wrapper.find("[data-test='settings-unlink-phone']").trigger("click");
    expect(wrapper.find("[data-cy='prompt-lines']").text()).toBe("Unlink Mia's phone? It stops working right away.");
    expect(mockSync.rest).not.toHaveBeenCalled();

    await wrapper.find("[data-cy='prompt-yes']").trigger("click");
    await flushPromises();

    expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
    expect(mockFamily.forgetDevice).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/xp-profile");
  });

  it("keeps the phone linked on No", async () => {
    const wrapper = await open();

    await wrapper.find("[data-test='settings-unlink-phone']").trigger("click");
    await wrapper.find("[data-cy='prompt-no']").trigger("click");
    await flushPromises();

    expect(mockSync.rest).not.toHaveBeenCalled();
    expect(mockFamily.forgetDevice).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
