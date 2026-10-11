import { mount } from "@vue/test-utils";
import XpLandmarkBadge from "../XpLandmarkBadge.vue";

describe("XpLandmarkBadge atom", () => {
  it("renders title correctly in mixed-case", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Town Hall",
      },
    });

    const titleEl = wrapper.find(".landmark-title");
    expect(titleEl.exists()).toBe(true);
    expect(titleEl.text()).toBe("Town Hall");
  });

  it("renders custom landmark names cleanly", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Pegasus Ranch",
      },
    });

    expect(wrapper.find(".landmark-title").text()).toBe("Pegasus Ranch");
  });

  it("accepts cue prop without cluttering the title view", () => {
    const wrapper = mount(XpLandmarkBadge, {
      props: {
        title: "Earth Temple",
        cue: "Tap to enter",
      },
    });

    expect(wrapper.find(".landmark-title").text()).toBe("Earth Temple");
  });
});
