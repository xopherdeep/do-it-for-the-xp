import { flushPromises, mount } from "@vue/test-utils";
import ApprovalFamilyRewardRow from "@/app/Admin/XpApprovals/components/ApprovalFamilyRewardRow.vue";
import { markRewardGiven } from "@/lib/services/projects/projectService";

/**
 * The row at the top of Approvals' achievements tab while a cleared project's family reward waits for the Game
 * Master: what the family agreed on, and "Mark as given" for when it happens. The service and the toast are stubs.
 */

const mockToast = jest.fn();

jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: mockToast }) }));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/services/projects/projectService", () => ({ __esModule: true, markRewardGiven: jest.fn() }));

const give = markRewardGiven as jest.Mock;

const mountRow = (text = "Pizza night, your pick") => mount(ApprovalFamilyRewardRow, { props: { text } });

beforeEach(() => {
  give.mockReset();
  mockToast.mockReset();
  give.mockResolvedValue(undefined);
});

describe("the Approvals row for the family reward", () => {
  it("says the family reward is earned, in the family's own words", () => {
    const wrapper = mountRow();
    expect(wrapper.get('[data-test="family-reward"]').text()).toContain("Family reward earned: Pizza night, your pick");
  });

  it("has a Mark as given button, labelled for the reward", () => {
    const button = mountRow().get('[data-test="family-reward-give"]');
    expect(button.text()).toContain("Mark as given");
    expect(button.attributes("aria-label")).toBe("Mark as given: Pizza night, your pick");
  });

  it("calls markRewardGiven when the button is tapped, then says it was given", async () => {
    const wrapper = mountRow();

    await wrapper.get('[data-test="family-reward-give"]').trigger("click");
    await flushPromises();

    expect(give).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("given")).toHaveLength(1);
  });

  it("marks it once however many times the button is tapped while it saves", async () => {
    let finish: () => void = () => undefined;
    give.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = mountRow();

    await wrapper.get('[data-test="family-reward-give"]').trigger("click");
    await wrapper.get('[data-test="family-reward-give"]').trigger("click");
    finish();
    await flushPromises();

    expect(give).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("given")).toHaveLength(1);
  });

  it("tells the Game Master when it did not save, and lets them try again", async () => {
    give.mockRejectedValueOnce(new Error("no storage"));
    const wrapper = mountRow();

    await wrapper.get('[data-test="family-reward-give"]').trigger("click");
    await flushPromises();

    expect(wrapper.emitted("given")).toBeUndefined();
    expect(mockToast).toHaveBeenCalledWith("That did not save. Try again.", expect.anything());
    await wrapper.get('[data-test="family-reward-give"]').trigger("click");
    await flushPromises();
    expect(give).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted("given")).toHaveLength(1);
  });
});
