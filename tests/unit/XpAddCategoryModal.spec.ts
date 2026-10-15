import { flushPromises, mount } from "@vue/test-utils";
import XpAddCategoryModal from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/XpAddCategoryModal.vue";

/**
 * The quest's category list (opened from the Category row of "What's the chore?"). The rows are tappable, so a parent
 * can pick an existing category; a typed name that already exists is offered as "Pick" instead of "Save" (the form
 * picks it rather than adding a second one); the trash button asks twice instead of raising an Ionic alert, and a
 * category a quest uses stays. The Ionic frame is stubbed.
 */

const mockToast = jest.fn(() => Promise.resolve({ present: jest.fn() }));
const mockAlert = jest.fn(() => Promise.resolve({ present: jest.fn() }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: (...args: unknown[]) => (mockToast as unknown as (...a: unknown[]) => unknown)(...args) },
  alertController: { create: (...args: unknown[]) => (mockAlert as unknown as (...a: unknown[]) => unknown)(...args) },
}));

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonList: slot,
  IonListHeader: slot,
  IonGrid: slot,
  IonRow: slot,
  IonCol: slot,
  IonButtons: slot,
  IonTitle: slot,
  IonRadioGroup: slot,
  IonRadio: { template: "<span class='radio-stub'></span>" },
  IonLabel: { template: "<span><slot /></span>" },
  IonNote: { template: "<span class='note-stub'><slot /></span>" },
  IonItem: { template: "<div class='item-stub'><slot /></div>" },
  IonInput: { props: ["modelValue", "value"], template: "<input class='input-stub' :value='modelValue ?? value' />" },
  IonButton: { props: ["disabled"], template: "<button type='button' :disabled='disabled'><slot /></button>" },
};

const categories = [
  { id: "c1", name: "Kitchen" },
  { id: "c2", name: "Garden" },
];

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(XpAddCategoryModal, {
    props: { isOpen: true, categories, questCounts: { c1: 2 }, current: "c2", ...props },
    global: { stubs },
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockToast.mockClear();
  mockAlert.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("picking a category from the list", () => {
  it("offers every category as a tappable row, the chosen one marked", () => {
    const wrapper = mountModal();
    expect(wrapper.find('[data-test="pick-c1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="pick-c2"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="pick-c2"]').classes()).toContain("is-current");
    expect(wrapper.get('[data-test="pick-c1"]').classes()).not.toContain("is-current");
    expect(wrapper.get('[data-test="pick-c1"]').text()).toContain("Kitchen");
  });

  it("tells the form which category was tapped and closes the list", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-test="pick-c1"]').trigger("click");
    expect(wrapper.emitted("pick-category")).toEqual([[categories[0]]]);
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });
});

describe("adding a category", () => {
  it("says Pick instead of Save when the typed name is a category already, in any case", async () => {
    const wrapper = mountModal();
    await wrapper.setData({ newCategoryName: "Laundry" });
    expect(wrapper.get('[data-test="save-category"]').text()).toContain("Save");
    await wrapper.setData({ newCategoryName: "  kitchen " });
    expect(wrapper.get('[data-test="save-category"]').text()).toContain("Pick");
  });

  it("hands the typed name to the form, which picks the existing category or adds the new one", async () => {
    const wrapper = mountModal();
    await wrapper.setData({ newCategoryName: "kitchen" });
    await wrapper.get('[data-test="save-category"]').trigger("click");
    const [event] = wrapper.emitted("add-category") ?? [];
    expect(event?.[0]).toMatchObject({ name: "kitchen" });
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });
});

describe("deleting a category without an alert", () => {
  it("asks twice: the first tap arms the button, the second deletes", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-test="delete-c2"]').trigger("click");
    expect(wrapper.emitted("delete-category")).toBeUndefined();
    expect(wrapper.get('[data-test="delete-c2"]').text()).toContain("Sure?");
    await wrapper.get('[data-test="delete-c2"]').trigger("click");
    expect(wrapper.emitted("delete-category")).toEqual([[categories[1]]]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("disarms by itself, so a later tap starts over", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-test="delete-c2"]').trigger("click");
    jest.advanceTimersByTime(3100);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="delete-c2"]').text()).not.toContain("Sure?");
    await wrapper.get('[data-test="delete-c2"]').trigger("click");
    expect(wrapper.emitted("delete-category")).toBeUndefined();
  });

  it("keeps a category a quest uses, and says so in a toast", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-test="delete-c1"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-test="delete-c1"]').trigger("click");
    await flushPromises();
    expect(wrapper.emitted("delete-category")).toBeUndefined();
    expect(mockToast).toHaveBeenCalled();
    expect(JSON.stringify(mockToast.mock.calls[0])).toContain("Kitchen is in use");
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
