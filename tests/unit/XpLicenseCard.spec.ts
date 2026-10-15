import { mount } from "@vue/test-utils";
import XpLicenseCard from "@/app/SideMenu/XpSettings/components/XpLicenseCard.vue";

const mountCard = (props: Record<string, unknown> = {}) =>
  mount(XpLicenseCard, {
    props: { plan: "lifetime", planLabel: "Lifetime", maskedKey: "XP-PRO-****-****-W3V9", memberSince: "Oct 2026", ...props },
  });

describe("the XP Pro license card", () => {
  it("is the gold three-star card for Lifetime, valid forever", () => {
    const wrapper = mountCard();
    expect(wrapper.classes()).toContain("is-lifetime");
    expect(wrapper.find('[data-cy="pro-tier"]').text()).toBe("★★★ Lifetime");
    expect(wrapper.text()).toContain("Valid thru");
    expect(wrapper.text()).toContain("Forever");
  });

  it("shows the hidden groups as dots and keeps the masked key for screen readers", () => {
    const key = mountCard().find('[data-cy="pro-masked-key"]');
    expect(key.text()).toBe("XP-PRO-••••-••••-W3V9");
    expect(key.attributes("aria-label")).toBe("XP-PRO-****-****-W3V9");
  });

  it("shows the renew date on a subscription card", () => {
    const wrapper = mountCard({ plan: "yearly", planLabel: "Yearly", validThru: "10/15/2027" });
    expect(wrapper.classes()).toContain("is-yearly");
    expect(wrapper.find('[data-cy="pro-tier"]').text()).toBe("★★ Yearly");
    expect(wrapper.text()).toContain("Renews");
    expect(wrapper.text()).toContain("10/15/2027");
  });

  it("asks the page to copy the key", async () => {
    const wrapper = mountCard();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("copy")).toHaveLength(1);
  });
});
