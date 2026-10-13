import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import XpFabUserHud from "@/app/Console/MyPortal/UserHud/components/XpFabUserHud.vue";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import { USER_MENU_CONFIG } from "@/constants";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => ({
    getForHero: jest.fn().mockResolvedValue([]),
    saveForHero: jest.fn().mockResolvedValue(undefined),
    clearForHero: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});

const HERO_ID = "hero-1";

const makeHero = () => ({
  id: HERO_ID,
  name: { full: "Link", first: "Link", last: "", middle: "", nick: "Link" },
  avatar: "001-hero",
  stats: {
    level: 5,
    gp: { wallet: 100 },
    ap: { total: 10 },
  },
});

describe("XpFabUserHud - notification badge on avatar circle", () => {
  let router: any;

  beforeEach(async () => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { render: () => null } }],
    });
    await router.push("/");
    await router.isReady();
  });

  const mountHud = (userProps: any = makeHero()) => {
    const userStore = useUserStore();
    userStore.users[HERO_ID] = userProps;

    return mount(XpFabUserHud, {
      props: {
        user: userProps,
        isUserFabOn: true,
      },
      global: {
        plugins: [router],
        mocks: {
          $requireAvatar: () => "avatar.png",
        },
        stubs: {
          "ion-fab": { template: "<div><slot /></div>" },
          "ion-grid": { template: "<div><slot /></div>" },
          "ion-row": { template: "<div><slot /></div>" },
          "ion-col": { template: "<div><slot /></div>" },
          "ion-fab-button": { template: "<button><slot /></button>" },
          "ion-img": { template: "<img />" },
          "ion-badge": { template: "<span><slot /></span>" },
          "ion-fab-list": { template: "<div><slot /></div>" },
          "save-and-quit-modal": true,
          "xp-rpg-menu": true,
        },
      },
    });
  };

  it("does not display a notification badge on avatar circle when there are zero unread notifications", async () => {
    const wrapper = mountHud();
    await flushPromises();

    const notifBadge = wrapper.find(".notification-badge");
    expect(notifBadge.exists()).toBe(false);

    const vm = wrapper.vm as any;
    const notifAction = vm.allUserActions.find(
      (action: any) => action.id === USER_MENU_CONFIG.notifications.id
    );
    expect(notifAction?.badge).toBeUndefined();
  });

  it("displays a badge number on the avatar circle when unread notifications exist", async () => {
    const notifStore = useNotificationsStore();
    notifStore.push({
      heroId: HERO_ID,
      kind: "system",
      title: "Quest completed",
      body: "You earned XP",
    });

    const wrapper = mountHud();
    await flushPromises();

    const notifBadge = wrapper.find(".notification-badge");
    expect(notifBadge.exists()).toBe(true);
    expect(notifBadge.text()).toBe("1");

    const vm = wrapper.vm as any;
    const notifAction = vm.allUserActions.find(
      (action: any) => action.id === USER_MENU_CONFIG.notifications.id
    );
    expect(notifAction?.badge).toBe(1);
  });

  it("displays 99+ on the avatar circle when unread count exceeds 99", async () => {
    const notifStore = useNotificationsStore();
    for (let i = 0; i < 105; i++) {
      notifStore.push({
        heroId: HERO_ID,
        kind: "system",
        title: `Notification ${i}`,
        body: "Detail",
      });
    }

    const wrapper = mountHud();
    await flushPromises();

    const notifBadge = wrapper.find(".notification-badge");
    expect(notifBadge.exists()).toBe(true);
    expect(notifBadge.text()).toBe("99+");

    const vm = wrapper.vm as any;
    const notifAction = vm.allUserActions.find(
      (action: any) => action.id === USER_MENU_CONFIG.notifications.id
    );
    expect(notifAction?.badge).toBe("99+");
  });
});
