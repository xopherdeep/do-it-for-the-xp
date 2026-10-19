import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import XpShareApp from "@/app/SideMenu/XpShareApp/XpShareApp.vue";

jest.mock("vue-router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@capacitor/share", () => ({ __esModule: true, Share: { share: jest.fn() } }));
// The two sheets the page opens are not what this spec is about
jest.mock("@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue", () => ({ __esModule: true, default: { template: "<div />" } }));
jest.mock("@/app/SideMenu/XpSettings/components/XpHeroPhonesModal.vue", () => ({ __esModule: true, default: { template: "<div />" } }));

describe("the Party Invites page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  const text = () => mount(XpShareApp).text();

  it("promises no referral reward: no XP, GP, Mystery Item or party XP, because none is ever paid", () => {
    const page = text();
    expect(page).not.toMatch(/referral/i);
    expect(page).not.toMatch(/\+\s?\d+\s?(XP|GP)/);
    expect(page).not.toMatch(/mystery item/i);
    expect(page).not.toMatch(/party xp/i);
    expect(page).not.toMatch(/rewards are granted/i);
  });

  it("keeps the share and copy actions, with one honest line about sending another family", () => {
    const wrapper = mount(XpShareApp);
    expect(wrapper.text()).toContain("Send another family on the adventure");
    expect(wrapper.text()).toContain("Share Party Invite");
    expect(wrapper.text()).toContain("Copy Invite Link");
  });
});
