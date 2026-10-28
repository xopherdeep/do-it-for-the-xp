import { flushPromises, mount } from "@vue/test-utils";
import { Share } from "@capacitor/share";
import VideoSettings from "@/app/SideMenu/XpSettings/components/VideoSettings.vue";
import { runDeviceTest } from "@/lib/services/graphics/deviceTest";
import { runDeviceExtras } from "@/lib/services/graphics/deviceTestExtras";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
import type { SampleStats } from "@/lib/services/graphics/frameMeter";
import type { DeviceTestConfigResult, DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";

jest.mock("@/lib/services/graphics/deviceSignals", () => ({
  __esModule: true,
  readDeviceSignals: jest.fn(() => ({
    chromeMajor: 86,
    androidMajor: 7,
    deviceMemoryGb: 2,
    cores: 4,
    dpr: 2,
    screen: { w: 360, h: 640 },
    webgl2: true,
    glRenderer: "Mali-T720",
    maxTextureSize: 4096,
    fragmentHighp: true,
    majorPerformanceCaveat: false,
  })),
}));
jest.mock("@/lib/services/graphics/deviceTest", () => ({ __esModule: true, runDeviceTest: jest.fn() }));
jest.mock("@/lib/services/graphics/deviceTestExtras", () => ({ __esModule: true, runDeviceExtras: jest.fn() }));
jest.mock("@/lib/services/graphics/deviceReport", () => ({
  ...jest.requireActual("@/lib/services/graphics/deviceReport"),
  __esModule: true,
  formatReport: jest.fn(() => "REPORT TEXT"),
  fastestConfig: jest.fn(() => "noMsaaDpr1"),
}));
jest.mock("@/lib/utils/clipboard", () => ({ __esModule: true, copyTextToClipboard: jest.fn() }));
jest.mock("@capacitor/share", () => ({ __esModule: true, Share: { canShare: jest.fn(), share: jest.fn() } }));

const stats: SampleStats = { count: 30, medianMs: 8, p95Ms: 12, worstMs: 20 };
const noStats: SampleStats = { count: 0, medianMs: null, p95Ms: null, worstMs: null };

const config = (id: DeviceTestConfigResult["id"], label: string, supported = true): DeviceTestConfigResult => ({
  id,
  label,
  supported,
  rendererMs: supported ? 40 : null,
  buildMs: supported ? 120 : null,
  firstRenderMs: supported ? 300 : null,
  work: supported ? stats : noStats,
  fps: supported ? 55 : null,
});

const result = (supported = true): DeviceTestResult => ({
  configs: [config("today", "Today's settings", supported), config("noMsaaDpr1", "No smoothing, 1x pixels", supported)],
  coldBuildMs: 90,
  tier: "classic",
  aborted: false,
});

const extras = { tiles: { count: 9, ms: 400 }, town: { count: 6, ms: 80 }, canvases: 2 };

const open = async () => {
  const wrapper = mount(VideoSettings, { global: { stubs: { "xp-back-button": true, "xp-hero-model": true } } });
  await flushPromises();
  return wrapper;
};

type Wrapper = Awaited<ReturnType<typeof open>>;

const testButton = (wrapper: Wrapper) => wrapper.find("[data-cy='video-test-button']");
// Ionic sets `disabled` as a property on the element, not an attribute
const isDisabled = (wrapper: Wrapper) => (testButton(wrapper).element as HTMLButtonElement).disabled === true;

const tap = async (wrapper: Wrapper) => {
  await testButton(wrapper).trigger("click");
  await flushPromises();
};

/** A runner that stays pending until the test settles it */
const pendingRun = () => {
  let finish: (value: DeviceTestResult) => void = () => undefined;
  (runDeviceTest as jest.Mock).mockImplementation(
    () => new Promise<DeviceTestResult>((resolve) => (finish = resolve)),
  );
  return (value: DeviceTestResult) => finish(value);
};

describe("Video, Test this device", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (runDeviceTest as jest.Mock).mockResolvedValue(result());
    (runDeviceExtras as jest.Mock).mockResolvedValue(extras);
    (copyTextToClipboard as jest.Mock).mockResolvedValue(true);
    (Share.canShare as jest.Mock).mockResolvedValue({ value: true });
    (Share.share as jest.Mock).mockResolvedValue({});
  });

  it("never runs by itself", async () => {
    const wrapper = await open();

    expect(runDeviceTest).not.toHaveBeenCalled();
    expect(wrapper.find("[data-cy='test-table']").exists()).toBe(false);
    expect(isDisabled(wrapper)).toBe(false);
  });

  it("goes idle, running, done, and disables the button while running", async () => {
    const finish = pendingRun();
    const wrapper = await open();

    await tap(wrapper);
    expect(isDisabled(wrapper)).toBe(true);
    expect(wrapper.find("[data-cy='test-progress']").exists()).toBe(true);
    expect(wrapper.find("[data-cy='test-table']").exists()).toBe(false);

    // A second tap while running must not start another run
    await tap(wrapper);
    expect(runDeviceTest).toHaveBeenCalledTimes(1);

    finish(result());
    await flushPromises();
    expect(isDisabled(wrapper)).toBe(false);
    expect(wrapper.find("[data-cy='test-progress']").exists()).toBe(false);
    expect(wrapper.find("[data-cy='test-table']").text()).toContain("Today's settings");
    expect(runDeviceExtras).toHaveBeenCalledTimes(1);
  });

  it("names the tier and the cap it puts on the hero for a non-Super result", async () => {
    const wrapper = await open();

    await tap(wrapper);
    const row = wrapper.find("[data-cy='test-tier']");
    expect(row.text()).toContain("Tier: Classic");
    expect(row.text()).toContain("Classic caps the hero at 30 fps");
  });

  it("names Super without a cap note, since Super is not capped", async () => {
    (runDeviceTest as jest.Mock).mockResolvedValue({ ...result(), tier: "super" });
    const wrapper = await open();

    await tap(wrapper);
    const row = wrapper.find("[data-cy='test-tier']");
    expect(row.text()).toContain("Tier: Super");
    expect(row.text()).not.toContain("caps the hero");
    expect(row.findAll("p")).toHaveLength(0);
  });

  it("shows Test N of M from the runner's progress and names the fastest setup", async () => {
    const finish = pendingRun();
    const wrapper = await open();

    await tap(wrapper);
    const { onProgress } = (runDeviceTest as jest.Mock).mock.calls[0][0];
    onProgress({ id: "noMsaa", label: "No smoothing", index: 1, count: 4 });
    await flushPromises();
    expect(wrapper.find("[data-cy='test-progress']").text()).toContain("Test 2 of 5");

    finish(result());
    await flushPromises();
    expect(wrapper.find("[data-cy='test-fastest']").text()).toContain("No smoothing, 1x pixels");
  });

  it("says plainly when the device cannot draw the 3D hero at all", async () => {
    (runDeviceTest as jest.Mock).mockResolvedValue(result(false));
    const wrapper = await open();

    await tap(wrapper);

    expect(wrapper.text()).toContain("cannot draw the 3D hero at all");
  });

  it("shares the formatted report", async () => {
    const wrapper = await open();
    await tap(wrapper);

    await wrapper.find("[data-cy='test-share']").trigger("click");
    await flushPromises();

    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ text: "REPORT TEXT" }));
    expect(copyTextToClipboard).not.toHaveBeenCalled();
  });

  it("copies nothing when the share sheet is dismissed", async () => {
    (Share.share as jest.Mock).mockRejectedValue({ name: "AbortError", message: "Share canceled" });
    const wrapper = await open();
    await tap(wrapper);

    await wrapper.find("[data-cy='test-share']").trigger("click");
    await flushPromises();

    expect(copyTextToClipboard).not.toHaveBeenCalled();
  });

  it("copies the report when the share is refused or the plugin throws", async () => {
    (Share.share as jest.Mock).mockRejectedValue(new Error("not implemented on web"));
    const wrapper = await open();
    await tap(wrapper);

    await wrapper.find("[data-cy='test-share']").trigger("click");
    await flushPromises();

    expect(copyTextToClipboard).toHaveBeenCalledWith("REPORT TEXT");
  });

  it("copies the report from the Copy button", async () => {
    const wrapper = await open();
    await tap(wrapper);

    await wrapper.find("[data-cy='test-copy']").trigger("click");
    await flushPromises();

    expect(copyTextToClipboard).toHaveBeenCalledWith("REPORT TEXT");
    expect(Share.share).not.toHaveBeenCalled();
  });

  it("aborts the run when the page unmounts", async () => {
    pendingRun();
    const wrapper = await open();
    await tap(wrapper);
    const { signal } = (runDeviceTest as jest.Mock).mock.calls[0][0];
    expect(signal.aborted).toBe(false);

    wrapper.unmount();

    expect(signal.aborted).toBe(true);
  });

  it("leaves no notice when a later share is dismissed", async () => {
    const wrapper = await open();
    await tap(wrapper);
    await wrapper.find("[data-cy='test-copy']").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-cy='test-notice']").text()).toBe("Report copied.");

    (Share.share as jest.Mock).mockRejectedValue({ name: "AbortError", message: "Share canceled" });
    await wrapper.find("[data-cy='test-share']").trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-cy='test-notice']").exists()).toBe(false);
  });

  it("clears an old notice when a new run starts", async () => {
    const wrapper = await open();
    await tap(wrapper);
    await wrapper.find("[data-cy='test-copy']").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-cy='test-notice']").exists()).toBe(true);

    pendingRun();
    await tap(wrapper);

    expect(wrapper.find("[data-cy='test-notice']").exists()).toBe(false);
  });

  it("keeps one polite live region in the page from the start and fills it with progress and notices", async () => {
    const finish = pendingRun();
    const wrapper = await open();
    const live = () => wrapper.find("[data-cy='test-live']");
    expect(live().exists()).toBe(true);
    expect(live().attributes("aria-live")).toBe("polite");
    expect(live().text()).toBe("");

    await tap(wrapper);
    const { onProgress } = (runDeviceTest as jest.Mock).mock.calls[0][0];
    onProgress({ id: "noMsaa", label: "No smoothing", index: 1, count: 4 });
    await flushPromises();
    expect(live().text()).toContain("Test 2 of 5");

    finish(result());
    await flushPromises();
    expect(live().text()).toBe("");

    await wrapper.find("[data-cy='test-copy']").trigger("click");
    await flushPromises();
    expect(live().text()).toBe("Report copied.");
    // the card owns exactly one live region; the page also holds the picker's own, so count inside the card only
    expect(wrapper.find(".video-test-card__root").findAll("[aria-live]")).toHaveLength(1);
  });

  it("says the test stopped and skips the extras when the run was aborted", async () => {
    (runDeviceTest as jest.Mock).mockResolvedValue({ ...result(), aborted: true });
    const wrapper = await open();

    await tap(wrapper);

    expect(runDeviceExtras).not.toHaveBeenCalled();
    expect(wrapper.find("[data-cy='test-table']").text()).toContain("Today's settings");
    expect(wrapper.find("[data-cy='test-notice']").text()).toBe(
      "The test stopped early because the app left the screen.",
    );
    expect(isDisabled(wrapper)).toBe(false);
  });

  describe("small screens", () => {
    const original = Element.prototype.scrollIntoView;
    afterEach(() => {
      Element.prototype.scrollIntoView = original;
    });

    it("brings the card to the top of the page scroller, at once, when a run starts", async () => {
      // block start: the scroller runs under the footer, so nearest stops while the card is still behind it;
      // no smooth behaviour: a busy test starves a smooth scroll of frames on a weak phone
      const scrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const wrapper = await open();

      await tap(wrapper);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    });

    it("brings the card into view again when the results land", async () => {
      const scrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const wrapper = await open();

      await tap(wrapper);

      expect(wrapper.find("[data-cy='test-table']").exists()).toBe(true);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("does nothing where scrollIntoView does not exist", async () => {
      // @ts-expect-error simulating an environment without the method
      Element.prototype.scrollIntoView = undefined;
      const wrapper = await open();

      await tap(wrapper);

      expect(wrapper.find("[data-cy='test-table']").exists()).toBe(true);
    });
  });
});
