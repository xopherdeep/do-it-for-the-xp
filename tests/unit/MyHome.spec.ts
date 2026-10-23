import { shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";
import MyHome from "@/app/Console/MyPortal/MyHome/MyHome.vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * GitHub issue 146: Ionic keeps the page cached, so when the party switches heroes the same MyHome instance sees a
 * new `:userId` on the route. The page used to read the id once in setup and kept acting for the first hero.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRoute = reactive({ name: "my-home", params: { userId: "hero-1" } as Record<string, string> });

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
    mockReplace.mockClear();
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

  it("Save & Quit signs the hero out, so their Family Sync turn rests, and opens the profile picker", () => {
    const userStore = useUserStore();
    userStore.loginUser(userStore.users["hero-1"]);
    const wrapper = mountHome();

    (wrapper.vm as any).confirmSaveQuit();
    (wrapper.vm as any).closeSaveQuitModal();

    expect(userStore.currentUser.id).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith({ name: "xp-profile" });
  });

  it("Save & Quit on a kid phone signs the hero out and returns to the hero-phone screen, not the picker", () => {
    const userStore = useUserStore();
    useFamilyStore().device = { heroId: "hero-1", label: "Arthur's phone" } as never;
    userStore.loginUser(userStore.users["hero-1"]);
    const wrapper = mountHome();

    (wrapper.vm as any).confirmSaveQuit();
    (wrapper.vm as any).closeSaveQuitModal();

    expect(userStore.currentUser.id).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith({ name: "hero-phone" });
    expect(mockReplace).not.toHaveBeenCalledWith({ name: "xp-profile" });
  });
});
