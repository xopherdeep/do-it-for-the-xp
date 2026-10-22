import { mount } from "@vue/test-utils";
import XpBattleRadialMenu from "@/app/Console/BattleField/components/XpBattleRadialMenu.vue";

const buttonStub = { props: ["disabled"], template: "<button :disabled=\"disabled\" @click=\"$emit('click')\"><slot /></button>" };
const stubs = {
  IonButton: buttonStub,
  IonFabButton: buttonStub,
  IonLabel: { template: "<span><slot /></span>" },
  IonImg: { template: "<img />" },
  XpIcon: { props: ["icon"], template: "<i :data-icon=\"icon\" />" },
  XpHeroModel: { template: "<div />" },
};

const action = (id: string, extra = {}) => ({ id, label: id, faIcon: `${id}-icon`, click: jest.fn(), ...extra });
const five = () => [action("attack", { note: "3 chores" }), action("defend"), action("powers", { disabled: true, note: "no MP" }), action("item", { note: "x2" }), action("run-away")];
const mountMenu = (actions = five()) => mount(XpBattleRadialMenu, { props: { actions }, global: { stubs } });

describe("XpBattleRadialMenu", () => {
  it("shows a note under the pills that have one", () => {
    const w = mountMenu();
    expect(w.find("[data-cy=action-attack] .pill-note").text()).toBe("3 chores");
    expect(w.find("[data-cy=action-goods] .pill-note").text()).toBe("x2");
    expect(w.find("[data-cy=action-defend] .pill-note").exists()).toBe(false);
  });

  it("a disabled pill is marked, disabled and never fires", async () => {
    const actions = five();
    const w = mountMenu(actions);
    const pill = w.find("[data-cy=action-powers]");
    expect(pill.classes()).toContain("is-disabled");
    expect(pill.attributes("disabled")).toBeDefined();
    await pill.trigger("click");
    expect(actions[2].click).not.toHaveBeenCalled();
    expect(w.emitted("action")).toBeUndefined();
  });

  it("the centre badge wears the Tackle icon and the centre tap tackles", async () => {
    const actions = five();
    const w = mountMenu(actions);
    expect(w.find(".center-badge").attributes("data-icon")).toBe("attack-icon");
    await w.find("[data-cy=radial-avatar-btn]").trigger("click");
    expect(actions[0].click).toHaveBeenCalled();
  });

  it("the confirm layout has no badge", () => {
    const w = mountMenu([action("keep-fighting"), action("run")]);
    expect(w.find(".center-badge").exists()).toBe(false);
  });
});
