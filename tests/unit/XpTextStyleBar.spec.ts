import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import XpTextStyleBar from "@/app/Console/MyPortal/UserHud/components/XpTextStyleBar.vue";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile() {
      return Promise.resolve();
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const bornAged = (age: number) => `${new Date().getFullYear() - age}-01-01`;

// Ionic's web components are not the subject here: slots and events are
const stubs = {
  IonToolbar: { template: "<div class='toolbar'><slot /></div>" },
  IonLabel: { template: "<span><slot /></span>" },
  IonSegment: { name: "IonSegment", props: ["value"], template: "<div class='segment'><slot /></div>" },
  IonSegmentButton: { props: ["value"], template: "<button class='choice' :data-value='value'><slot /></button>" },
  IonToggle: { name: "IonToggle", props: ["checked"], template: "<input type='checkbox' class='toggle' :checked='checked' />" },
};

const mountBar = (profile: Record<string, unknown>) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero", ...profile });
  const wrapper = mount(XpTextStyleBar, { props: { user: store.users.hero }, global: { stubs } });
  return { store, wrapper };
};

describe("XpTextStyleBar (Text style on the profile)", () => {
  it("offers Auto and the three voices, with Auto picked for a hero with no pick", () => {
    const { wrapper } = mountBar({ birthday: bornAged(6) });
    expect(wrapper.findAll(".choice").map((choice) => choice.text())).toEqual(["Auto", "Simple", "Adventure", "Classic"]);
    expect(wrapper.findComponent({ name: "IonSegment" }).props("value")).toBe("auto");
    expect(wrapper.text()).toContain("Auto: Simple for this hero");
  });

  it("saves the pick on the profile and Auto clears it", async () => {
    const { store, wrapper } = mountBar({ birthday: bornAged(6) });
    const segment = wrapper.findComponent({ name: "IonSegment" });
    segment.vm.$emit("ionChange", { detail: { value: "classic" } });
    await wrapper.vm.$nextTick();
    expect(store.users.hero.voice).toBe("classic");
    expect(segment.props("value")).toBe("classic");
    expect(wrapper.text()).toContain("Classic words for this hero");

    segment.vm.$emit("ionChange", { detail: { value: "auto" } });
    await wrapper.vm.$nextTick();
    expect(store.users.hero.voice).toBeUndefined();
    expect(segment.props("value")).toBe("auto");
  });

  it("shows the read-aloud switch only for the simple voice and saves it", async () => {
    const { store, wrapper } = mountBar({ birthday: bornAged(6) });
    const toggle = wrapper.findComponent({ name: "IonToggle" });
    expect(toggle.exists()).toBe(true);
    expect(toggle.props("checked")).toBe(true);
    toggle.vm.$emit("ionChange", { detail: { checked: false } });
    await wrapper.vm.$nextTick();
    expect(store.users.hero.autoRead).toBe(false);
    expect(wrapper.findComponent({ name: "IonToggle" }).props("checked")).toBe(false);

    store.setVoice("hero", "classic");
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: "IonToggle" }).exists()).toBe(false);
  });
});
