import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import XpCreateUpdateAbility from "@/app/Admin/XpCompendium/views/XpAbilities/components/XpCreateUpdateAbility.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";

/**
 * "In battle" on the Power wizard's "What does it do?" step: the In-Game Power's fight effect (eleven effects or None),
 * starting on the preset's own and saving the Game Master's pick.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/databases/AbilitiesDb", () => ({
  __esModule: true,
  default: class {
    getAbilityById = jest.fn();
    setAbility = jest.fn();
  },
  abilitiesStorage: {},
}));
jest.mock("uuid", () => ({ v4: jest.fn(() => "test-id") }));

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: slot,
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonTitle: slot,
  IonButtons: slot,
  IonButton: { template: "<button><slot /></button>" },
  IonIcon: { template: "<i />" },
  IonModal: { props: ["isOpen"], template: "<div v-if='isOpen'><slot /></div>" },
  XpCloseButton: { template: "<button></button>" },
  XpSpeakButton: { props: ["text"], template: "<button></button>" },
  XpIconPicker: { template: "<div></div>" },
};

const LIST = "/game-master/compendium/abilities";
const page = { template: "<div></div>" };

type Form = ReturnType<typeof mount>;
type Draft = { ability: Ability };

/** A new Power with a name, on "What does it do?" (the step with the effect fields), of the kind asked for. */
const openWhatDoesItDo = async (name: string, kind: Ability["type"] = AbilityType.RealLife): Promise<Form> => {
  setActivePinia(createPinia());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: LIST, component: page },
      { path: `${LIST}/create-update/:id?`, component: page },
    ],
  });
  router.push(`${LIST}/create-update`);
  await router.isReady();
  const wrapper = mount(XpCreateUpdateAbility, { global: { plugins: [router], stubs, components: { XpAppRow, XpAppSection } } });
  await flushPromises();
  await wrapper.get('[data-test="name"]').setValue(name);
  await wrapper.get(`[data-test="kind-${kind}"]`).trigger("click");
  await wrapper.get('[data-test="next"]').trigger("click");
  await flushPromises();
  return wrapper;
};

const choices = (wrapper: Form, group: string) => wrapper.findAll(`[data-cy="${group}"] [data-value]`).map((each) => each.attributes("data-value"));
const picked = (wrapper: Form, group: string) => wrapper.get(`[data-cy="${group}"] .is-picked`).attributes("data-value");
const choose = async (wrapper: Form, group: string, value: string) => {
  await wrapper.get(`[data-cy="${group}"] [data-value="${value}"]`).trigger("click");
  await flushPromises();
};
const draftOf = (wrapper: Form) => (wrapper.vm as unknown as Draft).ability;

describe("XpCreateUpdateAbility: In battle field", () => {
  it("shows In battle only for in-game Powers", async () => {
    const realLife = await openWhatDoesItDo("Movie night");
    expect(realLife.find('[data-cy="ability-battle-effect"]').exists()).toBe(false);

    const inGame = await openWhatDoesItDo("Movie night", AbilityType.InGame);
    expect(inGame.find('[data-cy="ability-battle-effect"]').exists()).toBe(true);
  });

  it("offers None and the eleven effects", async () => {
    const wrapper = await openWhatDoesItDo("Stop", AbilityType.InGame);
    const values = choices(wrapper, "ability-battle-effect");
    expect(values[0]).toBe("none");
    expect(values).toHaveLength(12);
    expect(values).toEqual(expect.arrayContaining(["frost", "time-stop", "kindle", "gust", "stun", "pin", "weaken", "vanish", "charge", "moonlight", "heal"]));
  });

  it("starts on the preset pick and saves the Game Master's choice", async () => {
    const wrapper = await openWhatDoesItDo("Stop", AbilityType.InGame);
    expect(picked(wrapper, "ability-battle-effect")).toBe("time-stop");

    await choose(wrapper, "ability-battle-effect", "frost");
    expect(draftOf(wrapper).battleEffect).toBe("frost");

    await choose(wrapper, "ability-battle-effect", "none");
    expect(draftOf(wrapper).battleEffect).toBe("none");
    expect(picked(wrapper, "ability-battle-effect")).toBe("none");
  });

  it("reads a Power with no preset as None", async () => {
    const wrapper = await openWhatDoesItDo("Quick Save", AbilityType.InGame);
    expect(picked(wrapper, "ability-battle-effect")).toBe("none");
  });
});
