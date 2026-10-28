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

// Finds a row by its visible label, then reads that row's own value line
const valueOf = (wrapper: Awaited<ReturnType<typeof open>>, label: string): string => {
  const row = wrapper.findAll("ion-item").find((item) => item.find("h2").text() === label);
  if (!row) throw new Error(`no row labelled ${label}`);
  return row.find("p").text();
};

describe("Settings, Video", () => {
  it("renders the title and the This device card", async () => {
    const wrapper = await open(known);

    expect(wrapper.find("ion-title").text()).toBe("Video");
    expect(wrapper.text()).toContain("This device");
  });

  it("shows a row for each signal the device reported", async () => {
    const wrapper = await open(known);

    expect(valueOf(wrapper, "Android")).toBe("7");
    expect(valueOf(wrapper, "Browser engine")).toBe("Chrome 86");
    expect(valueOf(wrapper, "Memory")).toBe("2 GB");
    expect(valueOf(wrapper, "Processor cores")).toBe("4");
    expect(valueOf(wrapper, "Screen")).toBe("360 x 640");
    expect(valueOf(wrapper, "3D drawing")).toBe("Yes");
    expect(wrapper.find("[data-cy='device-speed']").exists()).toBe(true);
  });

  it("says unknown for every signal the device would not report", async () => {
    const wrapper = await open(nothing);

    for (const label of ["Android", "Browser engine", "Memory", "Processor cores", "Screen"]) {
      expect(valueOf(wrapper, label)).toBe("unknown");
    }
    expect(valueOf(wrapper, "3D drawing")).toBe("No");
  });

  it("says the speed cannot be judged when the device cannot draw 3D", async () => {
    const wrapper = await open(nothing);

    expect(valueOf(wrapper, "Speed hint")).toBe("Cannot draw 3D here");
  });

  it("keeps the speed wording when 3D works but the caveat is unreported", async () => {
    const wrapper = await open({ ...known, majorPerformanceCaveat: null });

    expect(valueOf(wrapper, "Speed hint")).toBe("unknown");
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
