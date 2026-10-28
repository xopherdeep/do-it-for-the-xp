import { flushPromises, mount } from "@vue/test-utils";
import VideoSettings from "@/app/SideMenu/XpSettings/components/VideoSettings.vue";
import { readDeviceSignals, type DeviceSignals } from "@/lib/services/graphics/deviceSignals";

jest.mock("@/lib/services/graphics/deviceSignals", () => ({ __esModule: true, readDeviceSignals: jest.fn() }));

const known: DeviceSignals = {
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
};

const nothing: DeviceSignals = {
  chromeMajor: null,
  androidMajor: null,
  deviceMemoryGb: null,
  cores: null,
  dpr: null,
  screen: null,
  webgl2: false,
  glRenderer: null,
  maxTextureSize: null,
  fragmentHighp: null,
  majorPerformanceCaveat: null,
};

const open = async (signals: DeviceSignals) => {
  (readDeviceSignals as jest.Mock).mockReturnValue(signals);
  const wrapper = mount(VideoSettings, { global: { stubs: { "xp-back-button": true } } });
  await flushPromises();
  return wrapper;
};

const rowText = (wrapper: Awaited<ReturnType<typeof open>>, key: string) => wrapper.find(`[data-cy='device-${key}']`).text();

describe("Settings, Video", () => {
  it("renders the title and the This device card", async () => {
    const wrapper = await open(known);

    expect(wrapper.find("ion-title").text()).toBe("Video");
    expect(wrapper.text()).toContain("This device");
  });

  it("shows a row for each signal the device reported", async () => {
    const wrapper = await open(known);

    expect(rowText(wrapper, "android")).toContain("7");
    expect(rowText(wrapper, "engine")).toContain("86");
    expect(rowText(wrapper, "memory")).toContain("2");
    expect(rowText(wrapper, "cores")).toContain("4");
    expect(rowText(wrapper, "screen")).toContain("360");
    expect(rowText(wrapper, "screen")).toContain("640");
    expect(rowText(wrapper, "webgl")).toContain("Yes");
    expect(wrapper.find("[data-cy='device-speed']").exists()).toBe(true);
  });

  it("says unknown for every signal the device would not report", async () => {
    const wrapper = await open(nothing);

    for (const key of ["android", "engine", "memory", "cores", "screen", "speed"]) {
      expect(rowText(wrapper, key)).toContain("unknown");
    }
    expect(rowText(wrapper, "webgl")).toContain("No");
  });

  it("reads the signals once", async () => {
    (readDeviceSignals as jest.Mock).mockClear();
    await open(known);

    expect(readDeviceSignals).toHaveBeenCalledTimes(1);
  });

  it("reserves a footer for the buttons", async () => {
    const wrapper = await open(known);

    expect(wrapper.find("ion-footer").exists()).toBe(true);
    expect(wrapper.find("[data-cy='video-footer-slot']").exists()).toBe(true);
  });
});
