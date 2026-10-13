import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useCopy, useReadAloud, useVoice } from "@/hooks/useVoice";
import { useUserStore } from "@/lib/store/stores/user";

const mockSpeak = jest.fn((_text: string) => true);
const mockStop = jest.fn();
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: (text: string) => mockSpeak(text),
  stop: () => mockStop(),
}));

const mockSetProfile = jest.fn((_profile: unknown) => Promise.resolve());
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
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

/** A birthday that makes a hero `age` years old today */
const bornAged = (age: number) => {
  const today = new Date();
  return `${today.getFullYear() - age}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const signedIn = (profile: Record<string, unknown>) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero", ...profile });
  store.loginUser(store.users.hero);
  return store;
};

beforeEach(() => {
  localStorage.clear();
  mockSpeak.mockClear();
  mockStop.mockClear();
  mockSetProfile.mockClear();
});

describe("the profile's Text style", () => {
  it("setVoice saves a pick, Auto clears it, and a bad pick changes nothing", async () => {
    const store = signedIn({ birthday: bornAged(6) });
    expect(store.setVoice("hero", "classic")).toBe(true);
    expect(store.users.hero.voice).toBe("classic");
    expect((store.currentUser as any).voice).toBe("classic");
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSetProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "hero", voice: "classic" }));

    expect(store.setVoice("hero", "pirate" as any)).toBe(false);
    expect(store.setVoice("ghost", "simple")).toBe(false);
    expect(store.users.hero.voice).toBe("classic");

    expect(store.setVoice("hero", null)).toBe(true);
    expect(store.users.hero.voice).toBeUndefined();
    expect((store.currentUser as any).voice).toBeUndefined();
  });

  it("setAutoRead saves the switch for the simple voice", () => {
    const store = signedIn({ birthday: bornAged(6) });
    store.setAutoRead("hero", false);
    expect(store.users.hero.autoRead).toBe(false);
    store.setAutoRead("hero", true);
    expect(store.users.hero.autoRead).toBe(true);
    store.setAutoRead("ghost", false);
    expect(store.users.ghost).toBeUndefined();
  });
});

describe("useVoice / useCopy", () => {
  it("reads the signed-in hero's voice from their birthday and follows their pick", () => {
    const store = signedIn({ birthday: bornAged(6) });
    const { voice, isSimple } = useVoice();
    expect(voice.value).toBe("simple");
    expect(isSimple.value).toBe(true);
    store.setVoice("hero", "classic");
    expect(voice.value).toBe("classic");
    expect(isSimple.value).toBe(false);
    store.setVoice("hero", null);
    expect(voice.value).toBe("simple");
  });

  it("reads adventure when nobody is signed in or the birthday is unknown", () => {
    setActivePinia(createPinia());
    useUserStore().logoutUser();
    expect(useVoice().voice.value).toBe("adventure");
    signedIn({});
    expect(useVoice().voice.value).toBe("adventure");
  });

  it("useCopy() gives t(), the line in the hero's voice, and it changes when the hero changes", () => {
    const store = signedIn({ birthday: bornAged(6) });
    const t = useCopy();
    const vars = { beast: "Laundry Lich", xp: 200 };
    expect(t("demo.questDone", vars)).toBe("You did it! Get 200 XP!");
    store.addUser({ id: "teen", birthday: bornAged(19) });
    store.loginUser(store.users.teen);
    expect(t("demo.questDone", vars)).toBe("Laundry Lich defeated. 200 XP.");
    expect(t("demo.nothing")).toBe("demo.nothing");
  });

  it("auto-reads only in the simple voice, and not once the hero turns it off", () => {
    const store = signedIn({ birthday: bornAged(6) });
    const { playLine, startAutoReading } = useReadAloud();
    expect(startAutoReading("You did it! Get 5 XP!")).toBe(true);
    expect(mockSpeak).toHaveBeenLastCalledWith("You did it! Get 5 XP!");

    mockSpeak.mockClear();
    store.setAutoRead("hero", false);
    expect(startAutoReading("Hello")).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();
    // the speaker button still works
    expect(playLine("Hello")).toBe(true);
    expect(mockSpeak).toHaveBeenCalledWith("Hello");

    mockSpeak.mockClear();
    store.setAutoRead("hero", true);
    store.setVoice("hero", "adventure");
    expect(startAutoReading("Hello")).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it("stopReading() cuts the line off", () => {
    signedIn({ birthday: bornAged(6) });
    useReadAloud().stopReading();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it("cuts off the reading a screen started when it unmounts, and only then", async () => {
    signedIn({ birthday: bornAged(6) });
    const Reader = defineComponent({
      setup() {
        const t = useCopy();
        const { startAutoReading } = useReadAloud();
        const line = t("demo.hello", { name: "Ava" });
        startAutoReading(line);
        return { line };
      },
      template: "<p>{{ line }}</p>",
    });
    const Quiet = defineComponent({
      setup() {
        useReadAloud();
        return {};
      },
      template: "<p>quiet</p>",
    });
    const spoke = mount(Reader);
    await nextTick();
    expect(mockSpeak).toHaveBeenCalledWith("Welcome back, Ava. The quests missed you.");
    spoke.unmount();
    expect(mockStop).toHaveBeenCalledTimes(1);

    mockStop.mockClear();
    mount(Quiet).unmount();
    expect(mockStop).not.toHaveBeenCalled();
  });
});
