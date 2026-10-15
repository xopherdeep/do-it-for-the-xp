/**
 * The self-cleaning timers: callbacks run on time, cancel stops them, and a component's timers
 * are cleared when it unmounts.
 */

import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useTimers } from "@/hooks/useTimers";

describe("useTimers", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("runs a scheduled callback once, after the delay", () => {
    const timers = useTimers();
    const run = jest.fn();
    timers.startTimeout(100, run);
    jest.advanceTimersByTime(99);
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("repeats until cancelled", () => {
    const timers = useTimers();
    const run = jest.fn();
    const id = timers.startInterval(50, run);
    jest.advanceTimersByTime(150);
    expect(run).toHaveBeenCalledTimes(3);
    timers.cancel(id);
    jest.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("cancelAll stops pending timeouts and intervals", () => {
    const timers = useTimers();
    const once = jest.fn();
    const every = jest.fn();
    timers.startTimeout(100, once);
    timers.startInterval(100, every);
    timers.cancelAll();
    jest.advanceTimersByTime(1000);
    expect(once).not.toHaveBeenCalled();
    expect(every).not.toHaveBeenCalled();
  });

  it("clears a component's timers when it unmounts", () => {
    const once = jest.fn();
    const every = jest.fn();
    const Probe = defineComponent({
      setup() {
        const timers = useTimers();
        timers.startTimeout(100, once);
        timers.startInterval(100, every);
        return () => h("div");
      },
    });
    const wrapper = mount(Probe);
    wrapper.unmount();
    jest.advanceTimersByTime(1000);
    expect(once).not.toHaveBeenCalled();
    expect(every).not.toHaveBeenCalled();
  });
});
