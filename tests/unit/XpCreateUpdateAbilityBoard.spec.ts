import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import XpCreateUpdateAbility from "@/app/Admin/XpCompendium/views/XpAbilities/components/XpCreateUpdateAbility.vue";
import { AbilityType } from "@/hooks/abilities/abilityConstants";

jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  IonPage: { name: "IonPage", template: "<div><slot /></div>" },
  IonHeader: { name: "IonHeader", template: "<div><slot /></div>" },
  IonToolbar: { name: "IonToolbar", template: "<div><slot /></div>" },
  IonTitle: { name: "IonTitle", template: "<div><slot /></div>" },
  IonButtons: { name: "IonButtons", template: "<div><slot /></div>" },
  IonButton: { name: "IonButton", template: "<button><slot /></button>" },
  IonBackButton: { name: "IonBackButton", template: "<div></div>" },
  IonContent: { name: "IonContent", template: "<div><slot /></div>" },
  IonCard: { name: "IonCard", template: "<div><slot /></div>" },
  IonCardContent: { name: "IonCardContent", template: "<div><slot /></div>" },
  IonList: { name: "IonList", template: "<div><slot /></div>" },
  IonListHeader: { name: "IonListHeader", template: "<div><slot /></div>" },
  IonItem: { name: "IonItem", template: "<div><slot /></div>" },
  IonLabel: { name: "IonLabel", template: "<label><slot /></label>" },
  IonInput: { name: "IonInput", template: "<input />" },
  IonTextarea: { name: "IonTextarea", template: "<textarea />" },
  IonSelect: {
    name: "IonSelect",
    template: "<select @change='$emit(\"ionChange\", $event)'><slot /></select>",
  },
  IonSelectOption: { name: "IonSelectOption", template: "<option><slot /></option>" },
  IonNote: { name: "IonNote", template: "<div><slot /></div>" },
  IonFooter: { name: "IonFooter", template: "<div><slot /></div>" },
  IonRange: { name: "IonRange", template: "<div></div>" },
  modalController: { create: jest.fn(), dismiss: jest.fn() },
  toastController: { create: jest.fn(), dismiss: jest.fn() },
}));

jest.mock("@/lib/databases/AbilitiesDb", () => ({
  __esModule: true,
  default: class {
    getAbility = jest.fn();
    saveAbility = jest.fn();
  },
  abilitiesStorage: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-id"),
}));

describe("XpCreateUpdateAbility: On the quest board field", () => {
  let router: ReturnType<typeof createRouter>;

  const mountEditor = () =>
    mount(XpCreateUpdateAbility, {
      global: { plugins: [router] },
      props: {},
    });

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/game-master/compendium/abilities", component: { template: "<div></div>" } },
        { path: "/game-master/abilities/:id/edit", component: { template: "<div></div>" } },
      ],
    });
  });

  it("offers the five choices for a real-life Power", () => {
    const wrapper = mountEditor();

    const field = wrapper.find("[data-cy=ability-board-effect]");
    expect(field.exists()).toBe(true);
    const values = field.findAll("option").map((option) => option.element.value);
    expect(values).toEqual(["none", "snooze", "extra-time", "quiet-day", "trusted-hour"]);
  });

  it("is absent for an in-game Power, which gets In battle instead", async () => {
    const wrapper = mountEditor();

    wrapper.vm.ability.type = AbilityType.InGame;
    await wrapper.vm.$nextTick();

    expect(wrapper.find("[data-cy=ability-board-effect]").exists()).toBe(false);
    expect(wrapper.find("[data-cy=ability-battle-effect]").exists()).toBe(true);
  });

  it("starts on the preset pick and saves the Game Master's choice", async () => {
    const wrapper = mountEditor();

    wrapper.vm.ability.name = "Extra Time";
    await wrapper.vm.$nextTick();
    const select = wrapper.find("[data-cy=ability-board-effect]").find("select");
    expect(select.element.value).toBe("extra-time");

    await select.setValue("snooze");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.ability.boardEffect).toBe("snooze");
  });

  it("reads a new Power as None", () => {
    const wrapper = mountEditor();

    const select = wrapper.find("[data-cy=ability-board-effect]").find("select");
    expect(select.element.value).toBe("none");
  });
});
