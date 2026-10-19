import { shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";
import HomeTown from "@/app/Console/MyPortal/HomeTown/HomeTown.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * GitHub issue 146: Ionic keeps HomeTown cached, so when the party switches heroes the same page instance sees a new
 * `:userId` on the route. Every building in the plaza has to send the hero now on the route, not the first one.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
const mockRoute = reactive({ name: "home-town", params: { userId: "hero-1" } as Record<string, string> });

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}));

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  templeStorage: { create: jest.fn(async () => undefined) },
  TempleDb: class {
    getTempleById = async () => null;
  },
}));

const mountTown = () => shallowMount(HomeTown);

const enter = (wrapper: ReturnType<typeof mountTown>, label: string) => {
  const action = (wrapper.vm as any).userActions.find((a: { label: string }) => a.label === label);
  action.click();
};

describe("HomeTown", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockRoute.params.userId = "hero-1";

    const userStore = useUserStore();
    userStore.addUser({ id: "hero-1", nick: "Arthur", stats: { hp: 10, maxHp: 10 } });
    userStore.addUser({ id: "hero-2", nick: "Guinevere", stats: { hp: 10, maxHp: 10 } });
  });

  it("sends the hero on the route into the bank when the page is first opened", () => {
    const wrapper = mountTown();

    expect((wrapper.vm as any).userId).toBe("hero-1");
    expect((wrapper.vm as any).user.nick).toBe("Arthur");

    enter(wrapper, "Bank");
    expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
  });

  it("sends the new hero after the route's userId changes on the cached page", async () => {
    const wrapper = mountTown();

    mockRoute.params.userId = "hero-2";
    await nextTick();

    expect((wrapper.vm as any).userId).toBe("hero-2");
    expect((wrapper.vm as any).user.nick).toBe("Guinevere");

    enter(wrapper, "Bank");
    expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-2" } });

    enter(wrapper, "The Plains");
    expect(mockPush).toHaveBeenLastCalledWith({ name: "world-plains", params: { userId: "hero-2" } });
    expect(mockPush).not.toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
  });
});
