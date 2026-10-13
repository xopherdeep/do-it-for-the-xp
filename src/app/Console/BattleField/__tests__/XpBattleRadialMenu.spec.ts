import { mount } from "@vue/test-utils";
import XpBattleRadialMenu from "../components/XpBattleRadialMenu.vue";
import type { BattleMenuAction } from "../battle/battleMenu";

describe("XpBattleRadialMenu", () => {
  const createMockActions = (): BattleMenuAction[] => [
    {
      id: "attack",
      label: "Tackle",
      faIcon: "axe",
      click: jest.fn(),
    },
    {
      id: "defend",
      label: "Defend",
      faIcon: "shield-alt",
      click: jest.fn(),
    },
    {
      id: "powers",
      label: "Powers",
      faIcon: "book-spells",
      click: jest.fn(),
    },
    {
      id: "item",
      label: "Goods",
      faIcon: "backpack",
      click: jest.fn(),
    },
    {
      id: "run-away",
      label: "Run Away",
      faIcon: "running",
      click: jest.fn(),
    },
  ];

  const createRunConfirmActions = (): BattleMenuAction[] => [
    {
      id: "keep-fighting",
      label: "Keep fighting",
      faIcon: "fist-raised",
      click: jest.fn(),
    },
    {
      id: "run",
      label: "Run",
      faIcon: "running",
      click: jest.fn(),
    },
  ];

  it("renders all 5 combat actions in normal mode", () => {
    const actions = createMockActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: {
        actions,
        heroAvatar: "/assets/avatar.png",
        prompt: "Do its chores to win!",
      },
    });

    expect(wrapper.find('[data-cy="radial-prompt"]').text()).toBe("Do its chores to win!");
    expect(wrapper.find('[data-cy="action-attack"]').text()).toContain("Tackle");
    expect(wrapper.find('[data-cy="action-powers"]').text()).toContain("Powers");
    expect(wrapper.find('[data-cy="action-defend"]').text()).toContain("Defend");
    expect(wrapper.find('[data-cy="action-goods"]').text()).toContain("Goods");
    expect(wrapper.find('[data-cy="action-run"]').text()).toContain("Run Away");
    expect(wrapper.find('[data-cy="radial-avatar-btn"]').exists()).toBe(true);
  });

  it("triggers action click and emits event on pill tap", async () => {
    const actions = createMockActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: { actions },
    });

    await wrapper.find('[data-cy="action-attack"]').trigger("click");
    expect(actions[0].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[0]).toEqual(["attack"]);

    await wrapper.find('[data-cy="action-powers"]').trigger("click");
    expect(actions[2].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[1]).toEqual(["powers"]);

    await wrapper.find('[data-cy="action-defend"]').trigger("click");
    expect(actions[1].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[2]).toEqual(["defend"]);

    await wrapper.find('[data-cy="action-goods"]').trigger("click");
    expect(actions[3].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[3]).toEqual(["item"]);

    await wrapper.find('[data-cy="action-run"]').trigger("click");
    expect(actions[4].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[4]).toEqual(["run-away"]);
  });

  it("center avatar tap triggers attack action as shortcut", async () => {
    const actions = createMockActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: { actions },
    });

    await wrapper.find('[data-cy="radial-avatar-btn"]').trigger("click");
    expect(actions[0].click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("center-tap")).toBeTruthy();
  });

  it("does not trigger actions when disabled", async () => {
    const actions = createMockActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: { actions, disabled: true },
    });

    await wrapper.find('[data-cy="action-attack"]').trigger("click");
    expect(actions[0].click).not.toHaveBeenCalled();
    expect(wrapper.emitted("action")).toBeFalsy();
  });

  it("switches to confirmation layout when run confirm actions are present", async () => {
    const actions = createRunConfirmActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: {
        actions,
        prompt: "Run away? Your finished chores won't count.",
      },
    });

    expect(wrapper.find('[data-cy="action-attack"]').exists()).toBe(false);
    expect(wrapper.find('[data-cy="action-keep-fighting"]').text()).toContain("Keep fighting");
    expect(wrapper.find('[data-cy="action-confirm-run"]').text()).toContain("Run");

    await wrapper.find('[data-cy="action-keep-fighting"]').trigger("click");
    expect(actions[0].click).toHaveBeenCalledTimes(1);

    await wrapper.find('[data-cy="action-confirm-run"]').trigger("click");
    expect(actions[1].click).toHaveBeenCalledTimes(1);
  });

  it("renders bribe actions in confirmation layout when available", async () => {
    const fullBribeClick = jest.fn();
    const lowBribeClick = jest.fn();
    const actions: BattleMenuAction[] = [
      { id: "keep-fighting", label: "Keep fighting", faIcon: "fist-raised", click: jest.fn() },
      { id: "run", label: "Run", faIcon: "running", click: jest.fn() },
      { id: "bribe-full", label: "Bribe (25 GP)", faIcon: "coins", click: fullBribeClick },
      { id: "bribe-low", label: "Cheap Bribe (12 GP)", faIcon: "badge-percent", click: lowBribeClick },
    ];

    const wrapper = mount(XpBattleRadialMenu, {
      props: { actions, prompt: "Run away?" },
    });

    const fullBtn = wrapper.find('[data-cy="action-bribe-full"]');
    const lowBtn = wrapper.find('[data-cy="action-bribe-low"]');

    expect(fullBtn.exists()).toBe(true);
    expect(fullBtn.text()).toContain("Bribe (25 GP)");
    expect(lowBtn.exists()).toBe(true);
    expect(lowBtn.text()).toContain("Cheap Bribe (12 GP)");

    await fullBtn.trigger("click");
    expect(fullBribeClick).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[0]).toEqual(["bribe-full"]);

    await lowBtn.trigger("click");
    expect(lowBribeClick).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")?.[1]).toEqual(["bribe-low"]);
  });

  it("renders 3D voxel hero when heroLook is provided", () => {
    const actions = createMockActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: {
        actions,
        heroLook: {
          skin: "peach",
          hair: "short",
          hairColor: "#5a3a1e",
          face: "smile",
          eyeColor: "#2b2b3a",
          outfit: "tunic",
          outfitColor: "#3f7d4e",
          outfitAccent: "#e8d5a8",
          hat: "none",
          hatColor: "#b8342b",
        },
        animation: "hurt",
      },
      global: {
        stubs: {
          XpHeroModel: {
            name: "XpHeroModel",
            props: ["look", "animation"],
            template: '<div class="stub-hero-model" :data-animation="animation"></div>',
          },
        },
      },
    });

    const voxel = wrapper.find('[data-cy="radial-hero-voxel"]');
    expect(voxel.exists()).toBe(true);
    expect(voxel.attributes("data-animation")).toBe("hurt");
    expect(wrapper.find(".avatar-img").exists()).toBe(false);
  });

  it("center button in run confirmation mode acts as cancel", async () => {
    const actions = createRunConfirmActions();
    const wrapper = mount(XpBattleRadialMenu, {
      props: { actions },
    });

    await wrapper.find('[data-cy="radial-confirm-cancel-btn"]').trigger("click");
    expect(actions[0].click).toHaveBeenCalledTimes(1);
  });
});
