/**
 * Hero look: setLook keeps the look and the rendered avatar on the profile (and writes it back to
 * ProfileDb), getLook falls back to DEFAULT_LOOK, heroAvatarSrc prefers the snapshot over the SVG.
 * The real user store runs; only what it talks to (api, ProfileDb, GP service) is faked.
 */
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import { getLook, heroAvatarImage, heroAvatarSrc } from "@/lib/hero-look/look";
import { DEFAULT_LOOK, isHeroLook, type HeroLook } from "@/lib/hero-look/types";

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

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const lookup = jest.fn((key: string) => `/img/${key.slice(2)}`);

const customLook: HeroLook = { ...DEFAULT_LOOK, hair: "mohawk", hat: "wizard", outfit: "robe", skin: "deep" };

describe("hero look", () => {
  let store: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserStore();
    mockSetProfile.mockClear();
    lookup.mockClear();
    store.addUser({ id: "hero-1", avatar: "003-gamer", name: { nick: "Max" } });
  });

  describe("useUserStore().setLook", () => {
    it("writes the look and the avatar image to the profile and persists them", async () => {
      store.setLook("hero-1", customLook, PNG);
      await Promise.resolve();
      await Promise.resolve();

      expect(store.users["hero-1"].look).toEqual(customLook);
      expect(store.users["hero-1"].avatarImage).toBe(PNG);
      expect(mockSetProfile).toHaveBeenCalledTimes(1);
      expect(mockSetProfile.mock.calls[0][0]).toMatchObject({ id: "hero-1", look: customLook, avatarImage: PNG });
    });

    it("keeps the saved snapshot when no new one is given", () => {
      store.setLook("hero-1", customLook, PNG);
      store.setLook("hero-1", { ...customLook, hair: "bun" });

      expect(store.users["hero-1"].look.hair).toBe("bun");
      expect(store.users["hero-1"].avatarImage).toBe(PNG);
    });

    it("stores a copy, so later edits to the draft do not change the profile", () => {
      const draft = { ...customLook };
      store.setLook("hero-1", draft);
      draft.hair = "none";

      expect(store.users["hero-1"].look.hair).toBe("mohawk");
    });

    it("syncs the signed-in hero's currentUser", () => {
      store.loginUser(store.users["hero-1"]);
      store.setLook("hero-1", customLook, PNG);

      expect((store.currentUser as any).look).toEqual(customLook);
      expect((store.currentUser as any).avatarImage).toBe(PNG);
    });

    it("ignores a hero that does not exist", async () => {
      store.setLook("nobody", customLook, PNG);
      await Promise.resolve();

      expect(store.users["nobody"]).toBeUndefined();
      expect(mockSetProfile).not.toHaveBeenCalled();
    });
  });

  describe("getLook", () => {
    it("returns the saved look", () => {
      expect(getLook({ look: customLook })).toEqual(customLook);
    });

    it("falls back to DEFAULT_LOOK without a look, with junk, or without a user", () => {
      expect(getLook({})).toEqual(DEFAULT_LOOK);
      expect(getLook({ look: "bald" })).toEqual(DEFAULT_LOOK);
      expect(getLook(null)).toEqual(DEFAULT_LOOK);
      expect(isHeroLook(getLook(undefined))).toBe(true);
    });

    it("returns a copy, so editing it never changes DEFAULT_LOOK", () => {
      const look = getLook({});
      look.hair = "mohawk";

      expect(DEFAULT_LOOK.hair).toBe("short");
    });

    it("fills a field an older saved look is missing from the default", () => {
      const { hat: _hat, ...older } = customLook;

      expect(getLook({ look: older }).hat).toBe(DEFAULT_LOOK.hat);
    });
  });

  describe("heroAvatarSrc", () => {
    it("prefers the snapshot of the look over the avatar SVG", () => {
      expect(heroAvatarSrc({ avatar: "003-gamer", avatarImage: PNG }, lookup)).toBe(PNG);
      expect(lookup).not.toHaveBeenCalled();
    });

    it("falls back to the avatar SVG without a snapshot", () => {
      expect(heroAvatarSrc({ avatar: "003-gamer" }, lookup)).toBe("/img/003-gamer.svg");
    });

    it("ignores an avatarImage that is not an image data URL", () => {
      expect(heroAvatarImage({ avatarImage: "http://elsewhere/x.png" })).toBe("");
      expect(heroAvatarSrc({ avatar: "003-gamer", avatarImage: "nope" }, lookup)).toBe("/img/003-gamer.svg");
    });

    it("is empty when there is neither, or the SVG cannot be found", () => {
      const missing = () => {
        throw new Error("Cannot find module");
      };
      expect(heroAvatarSrc({}, lookup)).toBe("");
      expect(heroAvatarSrc(undefined, lookup)).toBe("");
      expect(heroAvatarSrc({ avatar: "999-gamer" }, missing)).toBe("");
    });

    it("shows the snapshot setLook saved", () => {
      store.setLook("hero-1", customLook, PNG);

      expect(heroAvatarSrc(store.users["hero-1"], lookup)).toBe(PNG);
    });
  });
});
