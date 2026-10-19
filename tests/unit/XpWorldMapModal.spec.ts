import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";
import XpWorldMapModal from "@/app/Console/MyPortal/UserHud/components/XpWorldMapModal.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * GitHub issue 146: the Sacred Pegasi list read whoever was signed in. It has to show the hero the modal is opened
 * for (the one on the route), so a parent looking at a kid's portal sees that kid's rescued Pegasi.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const noPegasi = () => [false, false, false, false, false, false, false, false, false];
const withAura = () => noPegasi().map((freed, index) => freed || index === 3);

const mockRoute = reactive({ params: { userId: "hero-2" } as Record<string, string> });
const mockRouter = { push: jest.fn(() => Promise.resolve()) };

const mountModal = () =>
  mount(XpWorldMapModal, {
    props: { isOpen: true },
    global: {
      mocks: { $route: mockRoute, $router: mockRouter },
      stubs: {
        IonCard: { template: "<div><slot /></div>" },
        IonCardContent: { template: "<div><slot /></div>" },
        XpCloseButton: true,
      },
    },
  });

describe("XpWorldMapModal", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.params.userId = "hero-2";
    mockRouter.push.mockClear();

    const userStore = useUserStore();
    userStore.addUser({ id: "hero-1", nick: "Arthur", stats: { pegasi: noPegasi() } });
    userStore.addUser({ id: "hero-2", nick: "Guinevere", stats: { pegasi: withAura() } });
    // The parent is signed in as hero 1 while looking at hero 2's portal
    userStore.currentUser.id = "hero-1";
    userStore.currentUser.stats = { pegasi: noPegasi() };
  });

  it("counts the Pegasi of the hero on the route, not the one signed in", () => {
    const wrapper = mountModal();

    expect(wrapper.find(".status-summary .count").text()).toBe("1 / 9");
  });

  it("counts the new hero's Pegasi after the route's userId changes on the cached page", async () => {
    const wrapper = mountModal();
    expect(wrapper.find(".status-summary .count").text()).toBe("1 / 9");

    mockRoute.params.userId = "hero-1";
    await nextTick();

    expect(wrapper.find(".status-summary .count").text()).toBe("0 / 9");
  });

  it("flies the hero on the route when a freed Pegasus is picked", async () => {
    const wrapper = mountModal();

    // Aura (index 3) is free for hero 2 and sleeps in the Plains
    await wrapper.findAll(".outer-crystal")[3].trigger("click");

    expect(mockRouter.push).toHaveBeenCalledWith({ name: "world-plains", params: { userId: "hero-2" } });
  });
});
