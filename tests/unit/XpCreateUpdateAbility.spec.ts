import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import XpCreateUpdateAbility from "@/app/Admin/XpCompendium/views/XpAbilities/components/XpCreateUpdateAbility.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { AbilityType, TimePeriod } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import { play$fx } from "@/assets/fx";
import { toastController } from "@ionic/vue";

/**
 * The Game Master's Power form as the shared wizard: What is it? > What does it do? > What does it cost? > Save. The
 * Ionic frame, the speech button and the database are stubs; the shell, the steps and the fields are real.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: jest.fn() },
}));
jest.mock("uuid", () => ({ v4: jest.fn(() => "test-id") }));

const mockGetAbilityById = jest.fn();
const mockSetAbility = jest.fn();
jest.mock("@/lib/databases/AbilitiesDb", () => ({
  __esModule: true,
  default: class {
    getAbilityById = (...args: unknown[]) => mockGetAbilityById(...args);
    setAbility = (...args: unknown[]) => mockSetAbility(...args);
  },
  abilitiesStorage: {},
}));

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
  IonModal: { props: ["isOpen"], template: "<div v-if='isOpen' class='modal-stub'><slot /></div>" },
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  // The picker confirms with `select`; this one picks a dragon
  XpIconPicker: {
    props: ["initialIcon", "initialPrefix"],
    emits: ["select"],
    template:
      "<div class='picker-stub' :data-icon='initialIcon' :data-prefix='initialPrefix'><button class='pick' @click=\"$emit('select', { iconName: 'dragon', iconPrefix: 'fas' })\"></button></div>",
  },
};

const LIST = "/game-master/compendium/abilities";
const page = { template: "<div></div>" };

const stored = (patch: Partial<Ability> = {}): Ability => ({
  id: "p1",
  name: "Movie night",
  description: "Pick the family movie",
  type: AbilityType.RealLife,
  frequency: TimePeriod.Weekly,
  mpCost: 5,
  apRequirement: { amount: 20, period: TimePeriod.Weekly },
  prerequisites: [],
  icon: "film",
  iconPrefix: "fad",
  isPreset: false,
  position: { x: 10, y: 20 },
  ...patch,
});

const mountForm = async (path = `${LIST}/create-update`) => {
  setActivePinia(createPinia());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: LIST, component: page },
      { path: `${LIST}/create-update/:id?`, component: page },
    ],
  });
  router.push(path);
  await router.isReady();
  const wrapper = mount(XpCreateUpdateAbility, {
    global: { plugins: [router], stubs, components: { XpAppRow, XpAppSection } },
  });
  await flushPromises();
  return { wrapper, router };
};

type Form = Awaited<ReturnType<typeof mountForm>>["wrapper"];

const tap = async (wrapper: Form, selector: string) => {
  await wrapper.get(selector).trigger("click");
  await flushPromises();
};
const typeName = async (wrapper: Form, name: string) => {
  await wrapper.get('[data-test="name"]').setValue(name);
  await flushPromises();
};
const next = (wrapper: Form) => tap(wrapper, '[data-test="next"]');
const meta = (wrapper: Form) => wrapper.get(".xp-app-header__meta").text();
const pick = (wrapper: Form, group: string, value: string) => tap(wrapper, `[data-cy="${group}"] [data-value="${value}"]`);
const valueOf = (wrapper: Form, group: string) =>
  wrapper.get(`[data-cy="${group}"] .is-picked`).attributes("data-value");
const inputOf = (wrapper: Form, test: string) => wrapper.get(`[data-test="${test}"] input`).element as HTMLInputElement;

const toast = { present: jest.fn() };

beforeEach(() => {
  (play$fx as jest.Mock).mockClear();
  (toastController.create as jest.Mock).mockReset().mockResolvedValue(toast);
  toast.present.mockClear();
  mockGetAbilityById.mockReset();
  mockSetAbility.mockReset().mockResolvedValue(undefined);
});

describe("a new Power", () => {
  it("opens on What is it?: New Power, 1 / 4, Close, and Next shut until it has a name", async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Power");
    expect(meta(wrapper)).toBe("1 / 4");
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="guide"]').text()).toContain("What is this Power");
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a name");
  });

  it("keeps the name field at the bottom, with the buttons, where a thumb types", async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.get(".xp-wiz-bar").find('[data-test="name"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="step-what"] [data-test="name"]').exists()).toBe(false);
  });

  it("opens Next once it has a name, and Close leaves for the Powers list", async () => {
    const { wrapper, router } = await mountForm();
    await typeName(wrapper, "Snooze");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="hero-name"]').text()).toBe("Snooze");

    await tap(wrapper, '[data-test="back"]');
    expect(router.currentRoute.value.path).toBe(LIST);
  });

  it("starts as Real Life and switches to In-Game with the kind tiles", async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.get('[data-test="kind-real-life"]').attributes("aria-checked")).toBe("true");
    await tap(wrapper, '[data-test="kind-in-game"]');
    expect(wrapper.get('[data-test="kind-in-game"]').attributes("aria-checked")).toBe("true");
    expect(wrapper.get('[data-test="kind-real-life"]').attributes("aria-checked")).toBe("false");
    expect((wrapper.vm as unknown as { ability: Ability }).ability.type).toBe(AbilityType.InGame);
  });

  it("walks to the summary and saves a Real Life Power once, with its toast, and goes back to the list", async () => {
    const { wrapper, router } = await mountForm();
    await typeName(wrapper, "  Snooze ");
    await wrapper.get('[data-test="description"]').setValue("Move a quest to tomorrow");
    await next(wrapper);
    expect(meta(wrapper)).toBe("2 / 4");

    await pick(wrapper, "ability-board-effect", "snooze");
    await next(wrapper);
    expect(meta(wrapper)).toBe("3 / 4");

    await tap(wrapper, '[data-test="mp"] [data-test="more"]');
    await tap(wrapper, '[data-test="mp"] [data-test="more"]');
    await pick(wrapper, "ability-frequency", "weekly");
    await next(wrapper);
    expect(meta(wrapper)).toBe("4 / 4");
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save");

    await tap(wrapper, '[data-test="submit"]');
    expect(mockSetAbility).toHaveBeenCalledTimes(1);
    expect(mockSetAbility.mock.calls[0][0]).toMatchObject({
      id: "test-id",
      name: "Snooze",
      description: "Move a quest to tomorrow",
      type: AbilityType.RealLife,
      boardEffect: "snooze",
      mpCost: 2,
      frequency: TimePeriod.Weekly,
    });
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ability "Snooze" saved successfully!', color: "success" })
    );
    expect(toast.present).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe(LIST);
  });

  it("does not save anything before the last step's verb", async () => {
    const { wrapper } = await mountForm();
    await typeName(wrapper, "Snooze");
    await next(wrapper);
    await next(wrapper);
    expect(mockSetAbility).not.toHaveBeenCalled();
  });

  it("keeps the form and says so when the save fails, and can be tried again", async () => {
    mockSetAbility.mockRejectedValueOnce(new Error("disk full"));
    const { wrapper, router } = await mountForm();
    await typeName(wrapper, "Snooze");
    await next(wrapper);
    await next(wrapper);
    await next(wrapper);

    await tap(wrapper, '[data-test="submit"]');
    expect(play$fx).toHaveBeenCalledWith("no");
    expect(toastController.create).toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    expect(router.currentRoute.value.path).toBe(`${LIST}/create-update`);

    await tap(wrapper, '[data-test="submit"]');
    expect(mockSetAbility).toHaveBeenCalledTimes(2);
    expect(router.currentRoute.value.path).toBe(LIST);
  });
});

describe("What does it do?", () => {
  const openStepTwo = async (kind: "real-life" | "in-game") => {
    const made = await mountForm();
    await typeName(made.wrapper, "Stop");
    await tap(made.wrapper, `[data-test="kind-${kind}"]`);
    await next(made.wrapper);
    return made;
  };

  it("asks a Real Life Power for its quest board effect and nothing else", async () => {
    const { wrapper } = await openStepTwo("real-life");
    expect(wrapper.find('[data-cy="ability-board-effect"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="ability-battle-effect"]').exists()).toBe(false);
    expect(wrapper.find('[data-cy="ability-class"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="effect"]').exists()).toBe(false);
  });

  it("asks an In-Game Power for who casts it, its effect, its battle effect and what it grows with", async () => {
    const { wrapper } = await openStepTwo("in-game");
    expect(wrapper.find('[data-cy="ability-board-effect"]').exists()).toBe(false);
    expect(wrapper.find('[data-cy="ability-class"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="hero-level"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="ability-battle-effect"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="ability-attribute"]').exists()).toBe(true);
    expect(wrapper.get(".xp-wiz-bar").find('[data-test="effect"]').exists()).toBe(true);
  });

  it("types the effect into the field at the bottom", async () => {
    const { wrapper } = await openStepTwo("in-game");
    await wrapper.get('[data-test="effect"]').setValue("Time stands still");
    expect((wrapper.vm as unknown as { ability: Ability }).ability.effect).toBe("Time stands still");
  });

  it("asks for a class level only once a class is picked, and writes the requirement", async () => {
    const { wrapper } = await openStepTwo("in-game");
    expect(wrapper.find('[data-test="class-level"]').exists()).toBe(false);

    await pick(wrapper, "ability-class", "time-mage");
    expect(wrapper.find('[data-test="class-level"]').exists()).toBe(true);
    expect(inputOf(wrapper, "class-level").value).toBe("1");
    await tap(wrapper, '[data-test="class-level"] [data-test="more"]');
    await tap(wrapper, '[data-test="hero-level"] [data-test="more"]');
    const vm = wrapper.vm as unknown as { ability: Ability };
    expect(vm.ability.characterRequirement).toEqual({ class: { "time-mage": 2 }, level: 1 });

    await pick(wrapper, "ability-class", "none");
    expect(wrapper.find('[data-test="class-level"]').exists()).toBe(false);
    expect(vm.ability.characterRequirement).toEqual({ level: 1 });
  });

  it("asks for a scaling rate only once an attribute is picked, and writes the scaling", async () => {
    const { wrapper } = await openStepTwo("in-game");
    expect(wrapper.find('[data-test="rate"]').exists()).toBe(false);

    await pick(wrapper, "ability-attribute", "wisdom");
    expect(inputOf(wrapper, "rate").value).toBe("10");
    await tap(wrapper, '[data-test="rate"] [data-test="more"]');
    const vm = wrapper.vm as unknown as { ability: Ability };
    expect(vm.ability.scaling).toEqual({ attribute: "wisdom", rate: 0.15 });

    await pick(wrapper, "ability-attribute", "none");
    expect(vm.ability.scaling).toBeUndefined();
    expect(wrapper.find('[data-test="rate"]').exists()).toBe(false);
  });
});

describe("What does it cost?", () => {
  const openStepThree = async () => {
    const made = await mountForm();
    await typeName(made.wrapper, "Snooze");
    await next(made.wrapper);
    await next(made.wrapper);
    return made;
  };

  it("counts MP and AP with the plus and minus, typing included", async () => {
    const { wrapper } = await openStepThree();
    expect(inputOf(wrapper, "mp").value).toBe("0");
    await tap(wrapper, '[data-test="mp"] [data-test="more"]');
    expect(inputOf(wrapper, "mp").value).toBe("1");
    await wrapper.get('[data-test="ap"] input').setValue("30");
    const vm = wrapper.vm as unknown as { ability: Ability };
    expect(vm.ability.mpCost).toBe(1);
    expect(vm.ability.apRequirement.amount).toBe(30);
  });

  it("will not go below 0", async () => {
    const { wrapper } = await openStepThree();
    expect(wrapper.get('[data-test="mp"] [data-test="less"]').attributes("disabled")).toBeDefined();
  });

  it("picks the AP period and how often it can be used", async () => {
    const { wrapper } = await openStepThree();
    await pick(wrapper, "ability-ap-period", "flat");
    await pick(wrapper, "ability-frequency", "hourly");
    const vm = wrapper.vm as unknown as { ability: Ability };
    expect(vm.ability.apRequirement.period).toBe(TimePeriod.Flat);
    expect(vm.ability.frequency).toBe(TimePeriod.Hourly);
    expect(valueOf(wrapper, "ability-ap-period")).toBe("flat");
  });
});

describe("the summary", () => {
  it("lists what was chosen and a tap on a line goes back to the step that owns it", async () => {
    const { wrapper } = await mountForm();
    await typeName(wrapper, "Snooze");
    await next(wrapper);
    await next(wrapper);
    await next(wrapper);
    expect(wrapper.find('[data-test="row-name"]').text()).toContain("Snooze");
    expect(wrapper.find('[data-test="row-board"]').text()).toContain("Move one quest to tomorrow");

    await tap(wrapper, '[data-test="row-mp"]');
    expect(meta(wrapper)).toBe("3 / 4");
    expect(wrapper.find('[data-test="step-cost"]').exists()).toBe(true);

    await tap(wrapper, '[data-test="dot-ready"]');
    await tap(wrapper, '[data-test="row-name"]');
    expect(meta(wrapper)).toBe("1 / 4");
  });

  it("holds Save and says which line is wrong when the form is not good", async () => {
    const { wrapper } = await mountForm();
    await typeName(wrapper, "Snooze");
    await next(wrapper);
    await next(wrapper);
    await next(wrapper);
    const vm = wrapper.vm as unknown as { ability: Ability };
    vm.ability.mpCost = -4;
    await flushPromises();
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("MP can't be negative");
  });
});

describe("the icon", () => {
  it("opens the picker on the Power's own icon and family when the icon is tapped", async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.find(".modal-stub").exists()).toBe(false);
    await tap(wrapper, '[data-test="icon-button"]');
    const picker = wrapper.get(".picker-stub");
    expect(picker.attributes("data-icon")).toBe("hand-holding-magic");
    expect(picker.attributes("data-prefix")).toBe("fad");
  });

  it("writes the pick back to the Power, shows it, and closes the picker", async () => {
    const { wrapper } = await mountForm();
    await tap(wrapper, '[data-test="icon-button"]');
    await tap(wrapper, ".picker-stub .pick");
    const vm = wrapper.vm as unknown as { ability: Ability };
    expect(vm.ability).toMatchObject({ icon: "dragon", iconPrefix: "fas" });
    expect(wrapper.find(".modal-stub").exists()).toBe(false);
    expect(wrapper.get(".pw-hero__tile i").classes()).toEqual(expect.arrayContaining(["fas", "fa-dragon"]));
  });

  it("closes the picker with its X and leaves the icon alone", async () => {
    const { wrapper } = await mountForm();
    await tap(wrapper, '[data-test="icon-button"]');
    await tap(wrapper, '[data-test="icon-close"]');
    expect(wrapper.find(".modal-stub").exists()).toBe(false);
    expect((wrapper.vm as unknown as { ability: Ability }).ability.icon).toBe("hand-holding-magic");
  });
});

describe("an edit", () => {
  it("opens the Power on its summary: Edit Power, 4 / 4, with Save", async () => {
    mockGetAbilityById.mockResolvedValue(stored());
    const { wrapper } = await mountForm(`${LIST}/create-update/p1`);
    expect(mockGetAbilityById).toHaveBeenCalledWith("p1");
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Edit Power");
    expect(meta(wrapper)).toBe("4 / 4");
    expect(wrapper.find('[data-test="step-ready"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="row-name"]').text()).toContain("Movie night");
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save");
  });

  it("lets the dots go back to any step", async () => {
    mockGetAbilityById.mockResolvedValue(stored());
    const { wrapper } = await mountForm(`${LIST}/create-update/p1`);
    await tap(wrapper, '[data-test="dot-what"]');
    expect(meta(wrapper)).toBe("1 / 4");
    expect(inputOf(wrapper, "name-field").value).toBe("Movie night");
    await tap(wrapper, '[data-test="dot-cost"]');
    expect(inputOf(wrapper, "mp").value).toBe("5");
  });

  it("saves the same Power under the same id, not a new one", async () => {
    mockGetAbilityById.mockResolvedValue(stored());
    const { wrapper, router } = await mountForm(`${LIST}/create-update/p1`);
    await tap(wrapper, '[data-test="row-mp"]');
    await tap(wrapper, '[data-test="mp"] [data-test="more"]');
    await tap(wrapper, '[data-test="dot-ready"]');
    await tap(wrapper, '[data-test="submit"]');
    expect(mockSetAbility).toHaveBeenCalledTimes(1);
    expect(mockSetAbility.mock.calls[0][0]).toMatchObject({ id: "p1", name: "Movie night", mpCost: 6, position: { x: 10, y: 20 } });
    expect(router.currentRoute.value.path).toBe(LIST);
  });

  it("reads an In-Game Power's class, level, effect and scaling into the steps", async () => {
    mockGetAbilityById.mockResolvedValue(
      stored({
        type: AbilityType.InGame,
        name: "Stop",
        effect: "Time stands still",
        characterRequirement: { level: 4, class: { "time-mage": 2 } },
        scaling: { attribute: "wisdom", rate: 0.2 },
      })
    );
    const { wrapper } = await mountForm(`${LIST}/create-update/p1`);
    await tap(wrapper, '[data-test="dot-does"]');
    expect(valueOf(wrapper, "ability-class")).toBe("time-mage");
    expect(inputOf(wrapper, "class-level").value).toBe("2");
    expect(inputOf(wrapper, "hero-level").value).toBe("4");
    expect(valueOf(wrapper, "ability-attribute")).toBe("wisdom");
    expect(inputOf(wrapper, "rate").value).toBe("20");
    expect((wrapper.get('[data-test="effect"]').element as HTMLInputElement).value).toBe("Time stands still");
  });

  it("starts over on step 1 when the id is not in the database", async () => {
    mockGetAbilityById.mockResolvedValue({ ...stored(), name: "", id: "fresh" });
    const { wrapper } = await mountForm(`${LIST}/create-update/missing`);
    expect(meta(wrapper)).toBe("1 / 4");
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
  });
});
