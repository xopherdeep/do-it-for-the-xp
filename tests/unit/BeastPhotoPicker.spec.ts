import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import BeastPhotoPicker from "@/components/organisms/BeastPhoto/BeastPhotoPicker.vue";
import { copyFor } from "@/lib/services/copy/copy";
import { openPicture, portraitFromImage } from "@/lib/services/creations/beastPhotoImage";
import { PhotoRejectedError } from "@/lib/services/quests/claimPhotoImage";

/**
 * The snap-a-drawing sheet. The canvas and the file reading are faked (jsdom has neither); what is checked is the
 * sheet's own work: the first screen, the frame it shows over the picture, how Smaller / Bigger / Fit and a drag move it,
 * and what Use it and Not now hand back to whoever opened the sheet.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

// The words are real (the catalog, in the adventure voice with nobody signed in); the reading is watched
const mockRead = jest.fn();
jest.mock("@/hooks/useVoice", () => ({
  ...jest.requireActual("@/hooks/useVoice"),
  useReadAloud: () => ({ startAutoReading: mockRead, stopReading: jest.fn(), playLine: jest.fn(), canRead: { value: true } }),
}));

const mockDismiss = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  modalController: { dismiss: (...args: unknown[]) => mockDismiss(...args) },
}));

jest.mock("@/lib/services/creations/beastPhotoImage", () => ({
  __esModule: true,
  openPicture: jest.fn(),
  portraitFromImage: jest.fn(),
}));

const mockOpenPicture = openPicture as jest.Mock;
const mockPortrait = portraitFromImage as jest.Mock;

const PORTRAIT = "data:image/jpeg;base64,PORTRAIT";
// A 400 x 300 picture: its largest square is x 50, y 0, side 300
const image = { naturalWidth: 400, naturalHeight: 300 };

const pass = { template: "<div><slot /></div>" };

const mountPicker = (props: { autoRead?: boolean } = {}) => mount(BeastPhotoPicker, { props, global: { stubs: { IonContent: pass } } });

/** Pick a file the way the browser does: the input's files, then a change */
const pickFile = async (wrapper: VueWrapper) => {
  const input = wrapper.find('[data-test="photo-input"]');
  Object.defineProperty(input.element, "files", { value: [new File(["x"], "drawing.jpg", { type: "image/jpeg" })], configurable: true });
  await input.trigger("change");
  await flushPromises();
};

const frameStyle = (wrapper: VueWrapper) => {
  const style = (wrapper.find('[data-test="photo-frame"]').element as HTMLElement).style;
  return {
    left: parseFloat(style.left),
    top: parseFloat(style.top),
    width: parseFloat(style.width),
    height: parseFloat(style.height),
  };
};

beforeAll(() => {
  // jsdom has neither object URLs nor pointer capture
  URL.revokeObjectURL = jest.fn();
  HTMLElement.prototype.setPointerCapture = jest.fn();
});

beforeEach(() => {
  mockDismiss.mockClear();
  mockRead.mockClear();
  mockPortrait.mockReset().mockReturnValue(PORTRAIT);
  mockOpenPicture.mockReset().mockResolvedValue({ image, url: "blob:drawing" });
});

describe("the first screen", () => {
  it("offers a picture to take or Not now, and nothing to crop yet", () => {
    const wrapper = mountPicker();
    expect(wrapper.find('[data-test="photo-take"]').text()).toContain("Take a picture");
    expect(wrapper.find('[data-test="photo-cancel"]').text()).toBe("Not now");
    expect(wrapper.find('[data-test="photo-frame"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="photo-use"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="photo-error"]').exists()).toBe(false);
  });

  it("speaks through the catalog: the title and the guide line are the Beast Maker's words", () => {
    const wrapper = mountPicker();
    expect(wrapper.find(".beast-photo__title").text()).toBe(copyFor("beastMaker.photo.title", "adventure"));
    expect(wrapper.find(".beast-photo__sub").text()).toBe(copyFor("beastMaker.photo.guide", "adventure"));
    expect(copyFor("beastMaker.photo.title", "simple")).toBe("Snap your drawing");
    expect(copyFor("beastMaker.photo.use", "classic")).toBe("Use this");
  });

  it("reads the guide line aloud when it opens from the Maker, and keeps quiet from the Game Master's form", () => {
    mountPicker({ autoRead: true });
    expect(mockRead).toHaveBeenCalledWith(copyFor("beastMaker.photo.guide", "adventure"));
    mockRead.mockClear();
    mountPicker();
    expect(mockRead).not.toHaveBeenCalled();
  });

  it("asks the camera on a phone and a file on a computer", () => {
    const input = mountPicker().find('[data-test="photo-input"]');
    expect(input.attributes("accept")).toBe("image/*");
    expect(input.attributes("capture")).toBe("environment");
  });
});

describe("a picture taken", () => {
  it("shows the largest square as the frame, and the tools and Use it", async () => {
    const wrapper = mountPicker();
    await pickFile(wrapper);
    expect(frameStyle(wrapper)).toEqual({ left: 12.5, top: 0, width: 75, height: 100 });
    for (const tool of ["photo-smaller", "photo-fit", "photo-bigger", "photo-use"]) {
      expect(wrapper.find(`[data-test="${tool}"]`).exists()).toBe(true);
    }
    expect(wrapper.find('[data-test="photo-take"]').text()).toContain("Another");
  });

  it("says the picture did not work, keeps nothing and offers the library, when it cannot be read", async () => {
    mockOpenPicture.mockRejectedValue(new PhotoRejectedError("not a picture"));
    const wrapper = mountPicker();
    await pickFile(wrapper);
    expect(wrapper.find('[data-test="photo-error"]').text()).toBe(
      "That picture didn't work. Try again or pick one from the library."
    );
    expect(wrapper.find('[data-test="photo-frame"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="photo-use"]').exists()).toBe(false);
  });
});

describe("the frame's tools", () => {
  it("Smaller shrinks it about its centre by a tenth of the short side", async () => {
    const wrapper = mountPicker();
    await pickFile(wrapper);
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    // 300 - 30 = 270 square, centred at (200, 150): starts at (65, 15)
    const frame = frameStyle(wrapper);
    expect(frame.left).toBeCloseTo(16.25);
    expect(frame.top).toBeCloseTo(5);
    expect(frame.width).toBeCloseTo(67.5);
    expect(frame.height).toBeCloseTo(90);
  });

  it("Bigger grows it back, and stops at the short side of the picture", async () => {
    const wrapper = mountPicker();
    await pickFile(wrapper);
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    await wrapper.find('[data-test="photo-bigger"]').trigger("click");
    expect(frameStyle(wrapper)).toEqual({ left: 12.5, top: 0, width: 75, height: 100 });
    await wrapper.find('[data-test="photo-bigger"]').trigger("click");
    expect(frameStyle(wrapper)).toEqual({ left: 12.5, top: 0, width: 75, height: 100 });
  });

  it("Fit puts the largest square back", async () => {
    const wrapper = mountPicker();
    await pickFile(wrapper);
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    await wrapper.find('[data-test="photo-fit"]').trigger("click");
    expect(frameStyle(wrapper)).toEqual({ left: 12.5, top: 0, width: 75, height: 100 });
  });
});

describe("dragging the frame", () => {
  // The picture is shown at 200 x 150 on the screen: half its size, so a screen pixel is two source pixels
  const showAtHalf = (wrapper: VueWrapper) => {
    const shown = wrapper.find("img").element;
    shown.getBoundingClientRect = () => ({ width: 200, height: 150 } as DOMRect);
  };

  const smallerFrame = async (wrapper: VueWrapper) => {
    await pickFile(wrapper);
    showAtHalf(wrapper);
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    await wrapper.find('[data-test="photo-smaller"]').trigger("click");
    // 240 square at (80, 30)
  };

  const pointer = (type: string, id: number, x: number, y: number) => ({ type, init: { pointerId: id, clientX: x, clientY: y } });

  const send = async (wrapper: VueWrapper, events: ReturnType<typeof pointer>[]) => {
    for (const { type, init } of events) {
      const frame = wrapper.find('[data-test="photo-frame"]');
      await frame.trigger(type, init);
    }
  };

  it("moves it by the drag, in source pixels", async () => {
    const wrapper = mountPicker();
    await smallerFrame(wrapper);
    await send(wrapper, [pointer("pointerdown", 1, 100, 100), pointer("pointermove", 1, 105, 110)]);
    // +5 and +10 screen pixels = +10 and +20 source pixels: from (80, 30) to (90, 50)
    const frame = frameStyle(wrapper);
    expect(frame.left).toBeCloseTo((90 / 400) * 100);
    expect(frame.top).toBeCloseTo((50 / 300) * 100);
    expect(frame.width).toBeCloseTo((240 / 400) * 100);
  });

  it("keeps it inside the picture", async () => {
    const wrapper = mountPicker();
    await smallerFrame(wrapper);
    await send(wrapper, [pointer("pointerdown", 1, 100, 100), pointer("pointermove", 1, 900, 900)]);
    const frame = frameStyle(wrapper);
    expect(frame.left).toBeCloseTo((160 / 400) * 100);
    expect(frame.top).toBeCloseTo((60 / 300) * 100);
  });

  it("ignores another finger, and a move after the finger is lifted", async () => {
    const wrapper = mountPicker();
    await smallerFrame(wrapper);
    const before = frameStyle(wrapper);
    await send(wrapper, [pointer("pointerdown", 1, 100, 100), pointer("pointermove", 2, 140, 140)]);
    expect(frameStyle(wrapper)).toEqual(before);
    await send(wrapper, [pointer("pointerup", 1, 100, 100), pointer("pointermove", 1, 140, 140)]);
    expect(frameStyle(wrapper)).toEqual(before);
  });
});

describe("the verbs", () => {
  it("Use it cuts the frame out and hands the portrait back as picked", async () => {
    const wrapper = mountPicker();
    await pickFile(wrapper);
    await wrapper.find('[data-test="photo-use"]').trigger("click");
    expect(mockPortrait).toHaveBeenCalledWith(image, { x: 50, y: 0, size: 300 });
    expect(mockDismiss).toHaveBeenCalledWith(PORTRAIT, "picked");
  });

  it("Use it keeps the sheet open and says so when the portrait cannot be cut", async () => {
    mockPortrait.mockImplementation(() => {
      throw new PhotoRejectedError("too big");
    });
    const wrapper = mountPicker();
    await pickFile(wrapper);
    await wrapper.find('[data-test="photo-use"]').trigger("click");
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="photo-error"]').exists()).toBe(true);
  });

  it("Not now closes it with nothing", async () => {
    const wrapper = mountPicker();
    await wrapper.find('[data-test="photo-cancel"]').trigger("click");
    expect(mockDismiss).toHaveBeenCalledWith(null, "cancel");
  });
});
