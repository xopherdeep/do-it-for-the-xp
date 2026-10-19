import { mount } from "@vue/test-utils";
import XpXpBar from "@/app/Console/MyPortal/UserHud/components/XpXpBar.vue";
import { levelProgress } from "@/lib/services/stats/levelProgress";

const barFor = (stats: Record<string, unknown>) => mount(XpXpBar, { props: { stats } });

describe("XpXpBar", () => {
  it("fills as far through the level as every other XP bar does", () => {
    const progress = levelProgress(2, 450);
    const wrapper = barFor({ level: 2, xp: { now: 450 } });

    const width = (wrapper.find(".progress-fill").element as HTMLElement).style.width;
    expect(parseFloat(width)).toBeCloseTo(progress.fraction * 100, 5);
  });

  it("shows the XP earned in the level and what the next level @ takes", () => {
    const progress = levelProgress(2, 450);
    const wrapper = barFor({ level: 2, xp: { now: 450 } });

    expect(wrapper.find(".label-left .value").text()).toBe(progress.inLevel.toLocaleString());
    expect(wrapper.find(".label-right .lvl-val").text()).toBe("3");
    expect(wrapper.find(".label-right .next-val").text()).toBe(progress.needed.toLocaleString());
  });

  it("starts a hero with no level or XP on level 1 and an empty bar", () => {
    const wrapper = barFor({});

    expect(parseFloat((wrapper.find(".progress-fill").element as HTMLElement).style.width)).toBe(0);
    expect(wrapper.find(".label-right .lvl-val").text()).toBe("2");
  });
});
