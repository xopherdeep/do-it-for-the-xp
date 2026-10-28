import { reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import XpFamilySyncLock from "@/app/SideMenu/XpSettings/components/XpFamilySyncLock.vue";

const mockPro = reactive({
  isPro: false,
  init: jest.fn(),
  requirePro: jest.fn(),
});
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

const open = async () => {
  const wrapper = mount(XpFamilySyncLock);
  await flushPromises();
  return wrapper;
};
type Opened = Awaited<ReturnType<typeof open>>;
const lock = (wrapper: Opened) => wrapper.find('[data-cy="family-sync-lock"]');

describe("XpFamilySyncLock", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPro.isPro = false;
    mockPro.init.mockResolvedValue(undefined);
    mockPro.requirePro.mockResolvedValue(false);
  });

  it("shows a free family the lock, named Family Sync", async () => {
    const wrapper = await open();
    expect(lock(wrapper).exists()).toBe(true);
    expect(lock(wrapper).text()).toContain("Family Sync");
  });

  it("shows a Pro family nothing", async () => {
    mockPro.isPro = true;
    expect(lock(await open()).exists()).toBe(false);
  });

  it("asks for the Family Sync gate when Unlock is tapped, which opens that upsell", async () => {
    const wrapper = await open();
    await wrapper.find('[data-cy="family-sync-unlock"]').trigger("click");
    expect(mockPro.requirePro).toHaveBeenCalledTimes(1);
    expect(mockPro.requirePro).toHaveBeenCalledWith("familySync");
  });

  it("names the feature on the Unlock button, so a screen reader hears more than 'Unlock'", async () => {
    const button = (await open()).find('[data-cy="family-sync-unlock"]');
    expect(button.attributes("aria-label")).toContain("Family Sync");
  });

  it("waits for the license to be read, so a Pro family never sees the lock flash on a cold start", async () => {
    let finish!: () => void;
    mockPro.init.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = mount(XpFamilySyncLock);
    await flushPromises();
    expect(lock(wrapper).exists()).toBe(false);
    finish();
    await flushPromises();
    expect(lock(wrapper).exists()).toBe(true);
  });

  it("still shows the lock when the license could not be read", async () => {
    mockPro.init.mockRejectedValue(new Error("offline"));
    expect(lock(await open()).exists()).toBe(true);
  });

  it("goes away when the family becomes Pro while it is on screen", async () => {
    const wrapper = await open();
    expect(lock(wrapper).exists()).toBe(true);
    mockPro.isPro = true;
    await flushPromises();
    expect(lock(wrapper).exists()).toBe(false);
  });
});
