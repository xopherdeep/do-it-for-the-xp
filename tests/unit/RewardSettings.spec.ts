import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import RewardSettings from "@/app/SideMenu/XpSettings/components/RewardSettings.vue";
import { DEFAULT_FAMILY_SETTINGS, type FamilySettings } from "@/lib/services/family/familySettings";

let mockCanManage = true;
let mockFamily: FamilySettings;
const mockSave = jest.fn().mockResolvedValue(undefined);

jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canManageFamily: () => mockCanManage }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ users: {} }) }));
jest.mock("@/lib/store/stores/gameRules", () => ({
  __esModule: true,
  useGameRulesStore: () => ({
    load: jest.fn().mockResolvedValue(undefined),
    save: mockSave,
    approveAllPurchases: false,
    setApproveAllPurchases: jest.fn(),
  }),
}));
jest.mock("@/lib/services/family/familySettings", () => {
  const actual = jest.requireActual("@/lib/services/family/familySettings");
  return { ...actual, loadFamilySettings: jest.fn(async () => mockFamily) };
});

const familyWith = (change: Partial<FamilySettings>): FamilySettings => ({
  ...JSON.parse(JSON.stringify(DEFAULT_FAMILY_SETTINGS)),
  ...change,
});

const open = async () => {
  const wrapper = mount(RewardSettings, { global: { stubs: { XpBackButton: true } } });
  await flushPromises();
  return wrapper;
};
type Opened = Awaited<ReturnType<typeof open>>;

const interestToggle = (wrapper: Opened) => wrapper.findComponent('[data-cy="interest-enabled"]') as VueWrapper<any>;
const interestRate = (wrapper: Opened) => wrapper.findComponent('[data-cy="interest-rate"]') as VueWrapper<any>;
/** The row holding the weekly rate select (greyed out while interest is off) */
const rateRow = (wrapper: Opened) => {
  const select = interestRate(wrapper).element;
  const rows = wrapper.findAllComponents({ name: "IonItem" }) as VueWrapper<any>[];
  return rows.find((row) => row.element.contains(select)) as VueWrapper<any>;
};
// The cash out switch is the first toggle on the page
const cashOutToggle = (wrapper: Opened) => wrapper.findAllComponents({ name: "IonToggle" })[0] as VueWrapper<any>;

beforeEach(() => {
  mockCanManage = true;
  mockFamily = familyWith({});
  mockSave.mockClear();
});

describe("Settings > Rewards: savings interest", () => {
  it("shows the interest card off, at 2 percent a week, on a fresh family", async () => {
    const wrapper = await open();
    expect(wrapper.find('[data-cy="interest-settings"]').exists()).toBe(true);
    expect(interestToggle(wrapper).props("checked")).toBe(false);
    expect(interestRate(wrapper).props("value")).toBe(2);
    expect(rateRow(wrapper).props("disabled")).toBe(true);
  });

  it("offers rates from half a percent to ten", async () => {
    const wrapper = await open();
    const options = wrapper.find('[data-cy="interest-rate"]').findAll("ion-select-option");
    const labels = options.map((option) => option.text());
    expect(labels[0]).toBe("0.5% a week");
    expect(labels[labels.length - 1]).toBe("10% a week");
    expect(labels).toContain("2% a week");
  });

  it("shows what the Game Master saved", async () => {
    mockFamily = familyWith({ savingsInterest: { enabled: true, weeklyRatePercent: 5 } });
    const wrapper = await open();
    expect(interestToggle(wrapper).props("checked")).toBe(true);
    expect(interestRate(wrapper).props("value")).toBe(5);
    expect(rateRow(wrapper).props("disabled")).toBe(false);
  });

  it("saves the switch, keeping the rate", async () => {
    const wrapper = await open();
    interestToggle(wrapper).vm.$emit("ionChange", { detail: { checked: true } });
    await flushPromises();
    expect(mockSave).toHaveBeenCalledWith({ savingsInterest: { enabled: true, weeklyRatePercent: 2 } });
    expect(interestToggle(wrapper).props("checked")).toBe(true);
  });

  it("saves the rate the Game Master picks, keeping the switch", async () => {
    mockFamily = familyWith({ savingsInterest: { enabled: true, weeklyRatePercent: 2 } });
    const wrapper = await open();
    interestRate(wrapper).vm.$emit("ionChange", { detail: { value: 7.5 } });
    await flushPromises();
    expect(mockSave).toHaveBeenCalledWith({ savingsInterest: { enabled: true, weeklyRatePercent: 7.5 } });
  });

  it("does not save when nothing changed", async () => {
    mockFamily = familyWith({ savingsInterest: { enabled: true, weeklyRatePercent: 5 } });
    const wrapper = await open();
    interestRate(wrapper).vm.$emit("ionChange", { detail: { value: 5 } });
    interestToggle(wrapper).vm.$emit("ionChange", { detail: { checked: true } });
    await flushPromises();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("locks the card for a hero who is not a Game Master", async () => {
    mockCanManage = false;
    const wrapper = await open();
    expect(interestToggle(wrapper).props("disabled")).toBe(true);
    interestToggle(wrapper).vm.$emit("ionChange", { detail: { checked: true } });
    await flushPromises();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe("Settings > Rewards: cash out starts off", () => {
  it("shows the cash out switch off on a fresh family", async () => {
    const wrapper = await open();
    expect(cashOutToggle(wrapper).props("checked")).toBe(false);
  });

  it("shows a Game Master's saved yes", async () => {
    mockFamily = familyWith({ cashOut: { enabled: true, gpPerDollar: 10, heroIds: [] } });
    const wrapper = await open();
    expect(cashOutToggle(wrapper).props("checked")).toBe(true);
  });
});
