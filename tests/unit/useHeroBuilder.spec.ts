/**
 * useHeroBuilder: the one hook every host (Gamer Card aside) uses to open the hero builder for a hero in the store.
 * The real user store runs; only what it talks to (api, ProfileDb, GP service) and the toast are faked.
 */
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { toastController } from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useHeroBuilder } from "@/hooks/useHeroBuilder";
import { DEFAULT_LOOK, type HeroLook } from "@/lib/hero-look/types";

const mockSetProfile = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile(profile: unknown) {
      return mockSetProfile(profile);
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
}));

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const builtLook: HeroLook = { ...DEFAULT_LOOK, hair: "mohawk", hat: "wizard", outfit: "robe", skin: "deep" };

describe("useHeroBuilder", () => {
  let store: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserStore();
    mockSetProfile.mockClear();
    (toastController.create as jest.Mock).mockClear();
    store.addUser({ id: "hero-1", avatar: "003-gamer", name: { nick: "Max" } });
  });

  it("saves the look on the hero and says so", async () => {
    const { save } = useHeroBuilder(ref("hero-1"));

    await save(builtLook, PNG);

    expect(store.users["hero-1"].look).toEqual(builtLook);
    expect(store.users["hero-1"].avatarImage).toBe(PNG);
    expect(toastController.create).toHaveBeenCalledWith(expect.objectContaining({ message: "Looking good!", cssClass: "rpg-toast" }));
  });

  it("offers no look for a hero who never built one", () => {
    const { look } = useHeroBuilder(ref("hero-1"));

    expect(look.value).toBeUndefined();
  });

  it("offers the saved look once the hero has built one", async () => {
    const { look, save } = useHeroBuilder(ref("hero-1"));

    await save(builtLook);

    expect(look.value).toEqual(builtLook);
  });

  it("opens and closes", () => {
    const { isOpen, open, close } = useHeroBuilder(ref("hero-1"));
    expect(isOpen.value).toBe(false);

    open();
    expect(isOpen.value).toBe(true);

    close();
    expect(isOpen.value).toBe(false);
  });

  it("hands over the hero's equipment for the hands, and none for a hero who is not there", () => {
    store.users["hero-1"].equipment = { leftHand: [{ faIcon: "fa-sword" }], rightHand: [] };
    const known = useHeroBuilder(ref("hero-1"));
    const stranger = useHeroBuilder(ref("nobody"));
    const unset = useHeroBuilder(ref<string | undefined>(undefined));

    expect(known.equipment.value).toEqual({ leftHand: [{ faIcon: "fa-sword" }], rightHand: [] });
    expect(stranger.equipment.value).toBeNull();
    expect(unset.equipment.value).toBeNull();
    expect(unset.look.value).toBeUndefined();
  });

  it("does nothing when there is no hero to save for", async () => {
    const { save } = useHeroBuilder(ref<string | undefined>(undefined));

    await save(builtLook, PNG);

    expect(mockSetProfile).not.toHaveBeenCalled();
    expect(toastController.create).not.toHaveBeenCalled();
  });
});
