import { defineComponent, h } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import VideoTierPicker from "@/app/SideMenu/XpSettings/components/video/VideoTierPicker.vue";
import { play$fx } from "@/assets/fx";
import { setVoxelTier, voxelTier } from "@/lib/services/graphics/deviceQuality";
import { TIER_BLURBS } from "@/lib/services/graphics/voxelQuality";
import { landmarkContextAntialias } from "@/components/organisms/BuildingModel/voxel/landmarkQuality";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/components/organisms/BuildingModel/voxel/landmarkQuality", () => ({
  __esModule: true,
  landmarkContextAntialias: jest.fn(() => null),
  landmarkRendererOptions: jest.requireActual("@/components/organisms/BuildingModel/voxel/landmarkQuality")
    .landmarkRendererOptions,
}));

const SLOT = "[data-cy='video-tier-slot']";

// The page owns the footer; the picker puts its segment into the slot it is told about
const Host = defineComponent({
  setup() {
    return () =>
      h("div", [
        h("ion-footer", [h("div", { "data-cy": "video-tier-slot" })]),
        h(VideoTierPicker, { footerTarget: SLOT }),
      ]);
  },
});

let frames: FrameRequestCallback[] = [];
const runFrame = () => {
  const due = frames;
  frames = [];
  due.forEach((cb) => cb(0));
};

const open = async (): Promise<VueWrapper> => {
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { "xp-hero-model": { name: "xp-hero-model", props: ["look"], template: "<div class='stub-hero'></div>" } } },
  });
  await flushPromises();
  return wrapper;
};

// Ionic sets value as a property on the element, so find the button by the label a person reads
const segmentButton = (value: string): HTMLElement => {
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  const buttons = Array.from(document.querySelectorAll("ion-segment-button")) as HTMLElement[];
  return buttons.find((b) => b.textContent?.trim() === label) as HTMLElement;
};

describe("Video tier picker", () => {
  beforeEach(() => {
    localStorage.clear();
    setVoxelTier("super");
    (play$fx as jest.Mock).mockClear();
    (landmarkContextAntialias as jest.Mock).mockReturnValue(null);
    frames = [];
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("puts one real-labelled segment button per tier inside the footer", async () => {
    const wrapper = await open();

    const footer = document.querySelector("ion-footer") as HTMLElement;
    const labels = Array.from(footer.querySelectorAll("ion-segment-button")).map((b) => b.textContent?.trim());
    expect(labels).toEqual(["Super", "Classic", "Pocket"]);
    expect(footer.querySelector("[data-cy='video-tier']")).not.toBeNull();
    wrapper.unmount();
  });

  it.each(["classic", "pocket", "super"] as const)("tapping %s saves it and plays the cursor sound", async (tier) => {
    setVoxelTier(tier === "super" ? "pocket" : "super");
    const wrapper = await open();

    segmentButton(tier).click();
    await flushPromises();

    expect(voxelTier.value).toBe(tier);
    expect(localStorage.getItem("xp.voxelQuality")).toBe(tier);
    expect(play$fx).toHaveBeenCalledWith("cursor");
    wrapper.unmount();
  });

  it("shows the chosen tier's blurb and ties it to the segment", async () => {
    const wrapper = await open();
    segmentButton("classic").click();
    await flushPromises();

    const blurb = document.querySelector("[data-cy='tier-blurb']") as HTMLElement;
    expect(blurb.textContent).toContain(TIER_BLURBS.classic);
    const segment = document.querySelector("[data-cy='video-tier']") as HTMLElement;
    expect(segment.getAttribute("aria-describedby")).toBe(blurb.id);
    wrapper.unmount();
  });

  it("mounts the preview only after two animation frames", async () => {
    const wrapper = await open();
    expect(wrapper.find(".stub-hero").exists()).toBe(false);

    runFrame();
    await flushPromises();
    expect(wrapper.find(".stub-hero").exists()).toBe(false);

    runFrame();
    await flushPromises();
    expect(wrapper.find(".stub-hero").exists()).toBe(true);
    wrapper.unmount();
  });

  it("redraws the preview on a fresh element when the tier changes", async () => {
    const wrapper = await open();
    runFrame();
    runFrame();
    await flushPromises();
    const before = wrapper.find(".stub-hero").element;

    segmentButton("pocket").click();
    await flushPromises();

    expect(wrapper.find(".stub-hero").element).not.toBe(before);
    wrapper.unmount();
  });

  it("says the change is for this device only", async () => {
    const wrapper = await open();

    expect(wrapper.text()).toContain("This changes only this device.");
    expect(wrapper.text()).toContain("Other heroes switch the next time their screen opens.");
    wrapper.unmount();
  });

  it("lists the facts from the knobs under Details", async () => {
    const wrapper = await open();
    segmentButton("pocket").click();
    await flushPromises();

    const details = wrapper.find("details");
    expect(details.exists()).toBe(true);
    expect(details.find("summary").text()).toBe("Details");
    expect(details.text()).toContain("20 per second");
    expect(details.text()).toContain("Up to 64 px");
    wrapper.unmount();
  });

  it("shows no restart notice before any town has drawn", async () => {
    const wrapper = await open();

    expect(wrapper.find("[data-cy='tier-restart']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the restart notice when the live town context disagrees with the chosen tier", async () => {
    // jsdom has no devicePixelRatio of 2: a ratio of 1 makes Super antialias, so a live context without it differs
    (landmarkContextAntialias as jest.Mock).mockReturnValue(false);
    const wrapper = await open();

    const notice = wrapper.find("[data-cy='tier-restart']");
    expect(notice.exists()).toBe(true);
    expect(notice.attributes("aria-live")).toBe("polite");
    expect(notice.text()).toContain("close the game completely");
    wrapper.unmount();
  });

  it("drops the restart notice when the live context already matches", async () => {
    (landmarkContextAntialias as jest.Mock).mockReturnValue(false);
    const wrapper = await open();
    segmentButton("classic").click();
    await flushPromises();

    expect(wrapper.find("[data-cy='tier-restart']").exists()).toBe(false);
    wrapper.unmount();
  });
});
