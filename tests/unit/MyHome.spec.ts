import { shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";
import MyHome from "@/app/Console/MyPortal/MyHome/MyHome.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * GitHub issue 146: Ionic keeps the page cached, so when the party switches heroes the same MyHome instance sees a
 * new `:userId` on the route. The page used to read the id once in setup and kept acting for the first hero.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
const mockRoute = reactive({ name: "my-home", params: { userId: "hero-1" } as Record<string, string> });

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useRoute: () => mockRoute,
}));

const mountHome = () => shallowMount(MyHome);

const goOutside = (wrapper: ReturnType<typeof mountHome>) => {
  const action = (wrapper.vm as any).userActions.find((a: { id?: string }) => a.id === "home-town");
  action.click();
};

describe("MyHome", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockRoute.params.userId = "hero-1";

    const userStore = useUserStore();
    userStore.addUser({ id: "hero-1", nick: "Arthur", name: { first: "Arthur" }, stats: { hp: 10, maxHp: 10 } });
    userStore.addUser({ id: "hero-2", nick: "Guinevere", name: { first: "Guinevere" }, stats: { hp: 10, maxHp: 10 } });
  });

  it("acts for the hero on the route when the page is first opened", () => {
    const wrapper = mountHome();

    expect((wrapper.vm as any).userId).toBe("hero-1");
    expect((wrapper.vm as any).user.nick).toBe("Arthur");

    goOutside(wrapper);
    expect(mockPush).toHaveBeenCalledWith({ name: "home-town", params: { userId: "hero-1" } });
  });

  it("acts for the new hero after the route's userId changes on the cached page", async () => {
    const wrapper = mountHome();

    mockRoute.params.userId = "hero-2";
    await nextTick();

    expect((wrapper.vm as any).userId).toBe("hero-2");
    expect((wrapper.vm as any).user.nick).toBe("Guinevere");

    goOutside(wrapper);
    expect(mockPush).toHaveBeenCalledWith({ name: "home-town", params: { userId: "hero-2" } });
    expect(mockPush).not.toHaveBeenCalledWith({ name: "home-town", params: { userId: "hero-1" } });
  });
});
