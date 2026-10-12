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

describe("XpCreateUpdateAbility: In battle field", () => {
  let router: ReturnType<typeof createRouter>;

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

  it("shows In battle only for in-game Powers", async () => {
    // Real-life Power: field should NOT be present
    const realLifeWrapper = mount(XpCreateUpdateAbility, {
      global: { plugins: [router] },
      props: {},
    });

    let battleEffectField = realLifeWrapper.find("[data-cy=ability-battle-effect]");
    expect(battleEffectField.exists()).toBe(false);

    // In-game Power: field SHOULD be present
    const inGameWrapper = mount(XpCreateUpdateAbility, {
      global: { plugins: [router] },
      props: {},
    });

    // Set to in-game type from the start
    inGameWrapper.vm.ability.type = AbilityType.InGame;
    await inGameWrapper.vm.$nextTick();

    battleEffectField = inGameWrapper.find("[data-cy=ability-battle-effect]");
    expect(battleEffectField.exists()).toBe(true);
  });

  it("starts on the preset pick and saves the GM's choice", async () => {
    const wrapper = mount(XpCreateUpdateAbility, {
      global: { plugins: [router] },
      props: {},
    });

    // Set ability name to "Stop" and type to in-game
    wrapper.vm.ability.name = "Stop";
    wrapper.vm.ability.type = AbilityType.InGame;
    await wrapper.vm.$nextTick();

    // Find the battle effect select
    const battleEffectSelect = wrapper.find("[data-cy=ability-battle-effect]");
    expect(battleEffectSelect.exists()).toBe(true);

    // Check that it starts on the preset (time-stop)
    const selectElement = battleEffectSelect.find("select");
    expect(selectElement.element.value).toBe("time-stop");

    // Change to None by triggering the ionChange event
    const selectInIonItem = battleEffectSelect.find("select");
    await selectInIonItem.setValue("none");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.ability.battleEffect).toBe("none");
  });
});
