import { mount } from "@vue/test-utils";
import XpLandmarkBadge from "../XpLandmarkBadge.vue";

describe("XpLandmarkBadge atom", () => {
  it("renders title and default cue correctly", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Town Hall",
      },
    });

    const titleEl = wrapper.find(".landmark-title");
    const cueEl = wrapper.find(".landmark-cue");

    expect(titleEl.exists()).toBe(true);
    expect(titleEl.text()).toBe("Town Hall");
    expect(cueEl.exists()).toBe(true);
    expect(cueEl.text()).toBe("Tap to enter");
  });

  it("renders custom cue when provided", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Pegasus Ranch",
        cue: "Tap to shop",
      },
    });

    expect(wrapper.find(".landmark-title").text()).toBe("Pegasus Ranch");
    expect(wrapper.find(".landmark-cue").text()).toBe("Tap to shop");
  });

  it("omits cue when cue is empty string", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Earth Temple",
        cue: "",
      },
    });

    expect(wrapper.find(".landmark-title").text()).toBe("Earth Temple");
    expect(wrapper.find(".landmark-cue").exists()).toBe(false);
  });
});
