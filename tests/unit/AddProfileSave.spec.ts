import User, { mergeProfileEdit, profileToSave, type ProfileFormValues, type StoredProfile } from "@/lib/utils/User/user";
import Stats from "@/lib/utils/User/stats";

// The profile form edits a few fields. Saving an edit must never drop the rest of the hero.

const LOOK = { skin: "tan", hair: "brown", outfit: "green" } as const;
const NEWER_LOOK = { skin: "pale", hair: "red", outfit: "blue" } as const;

/** A hero that has played for a while: it carries many fields the form never shows. */
const playedHero = (): StoredProfile => ({
  id: "hero-1",
  email: "sam@example.com",
  passcode: "1234",
  name: { full: "Sam Jo Smith", first: "Sam", middle: "Jo", last: "Smith", nick: "Sam", preferred: "Sammy" },
  avatar: "004-gamer",
  look: { ...LOOK },
  avatarImage: "data:image/png;base64,OLD",
  favoriteFood: "Pizza",
  favoriteThing: "Dragons",
  jobClass: "Knight",
  isAdult: false,
  birthday: "2016-04-02",
  unlockedItems: ["Wooden Sword", "Leather Cap"],
  equipment: { leftHand: "Wooden Sword", rightHand: "Wooden Shield", head: "Leather Cap" },
  inventory: [{ itemId: "potion", quantity: 3 }],
  questEffects: [{ id: "fx-1", kind: "xp-boost", until: 1_800_000_000_000 }],
  powers: ["Heal"],
  notifications: [{ id: "n-1", text: "Welcome" }],
  stats: {
    ...new Stats({ xp: { now: 40, next_level: 120, ledger: [] } }),
    level: 3,
    pegasi: { stable: ["Skyfoal"], flown: 2 },
  },
});

/** The form as AddProfile builds it from a stored hero (its `newProfile` computed). */
const formFor = (stored: StoredProfile, changes: Partial<ProfileFormValues> = {}): ProfileFormValues => ({
  id: stored.id,
  email: stored.email,
  passcode: stored.passcode,
  name: { full: stored.name.full },
  avatar: stored.avatar,
  look: stored.look,
  avatarImage: stored.avatarImage,
  favoriteThing: stored.favoriteThing,
  favoriteFood: stored.favoriteFood,
  jobClass: stored.jobClass,
  isAdult: stored.isAdult,
  // On the edit path the form's own stats are a fresh Stats() when it was opened by id only
  stats: new Stats(),
  ...changes,
});

/** Profile storage as ProfileDb exposes it: get by id, and newProfile (which is `new User`). */
const storageHolding = (...heroes: StoredProfile[]) => ({
  get: jest.fn(async (id: string) => heroes.find((hero) => hero.id === id) ?? null),
  newProfile: jest.fn((form: ProfileFormValues) => new User(form) as unknown as StoredProfile),
});

describe("saving an edit to an existing hero", () => {
  it("changes the name and keeps everything the form does not show", async () => {
    const stored = playedHero();
    const storage = storageHolding(stored);
    const form = formFor(stored, { name: { full: "Samantha Smith" } });

    const saved = await profileToSave(storage, form);

    expect(saved.name.full).toBe("Samantha Smith");
    expect(saved.name.first).toBe("Samantha");
    expect(saved.name.last).toBe("Smith");
    expect(saved.name.preferred).toBe("Sammy");

    expect(saved.equipment).toEqual(stored.equipment);
    expect(saved.inventory).toEqual(stored.inventory);
    expect(saved.questEffects).toEqual(stored.questEffects);
    expect(saved.stats.pegasi).toEqual({ stable: ["Skyfoal"], flown: 2 });
    expect(saved.stats.level).toBe(3);
    expect(saved.stats.xp.now).toBe(40);
    expect(saved.look).toEqual(LOOK);
    expect(saved.avatarImage).toBe("data:image/png;base64,OLD");
    expect(saved.powers).toEqual(["Heal"]);
    expect(saved.notifications).toEqual(stored.notifications);
    expect(saved.unlockedItems).toEqual(["Wooden Sword", "Leather Cap"]);
    expect(saved.birthday).toBe("2016-04-02");
    expect(saved.id).toBe("hero-1");
    expect(saved.email).toBe("sam@example.com");
    expect(saved.passcode).toBe("1234");
    expect(storage.newProfile).not.toHaveBeenCalled();
  });

  it("keeps the stored stats even though the form was opened by id and holds a fresh Stats", async () => {
    const stored = playedHero();
    const saved = await profileToSave(storageHolding(stored), formFor(stored));
    expect(saved.stats).toEqual(stored.stats);
  });

  it("keeps the whole name block when the name did not change", async () => {
    const stored = playedHero();
    const saved = await profileToSave(storageHolding(stored), formFor(stored, { favoriteFood: "Tacos" }));
    expect(saved.name).toEqual(stored.name);
    expect(saved.favoriteFood).toBe("Tacos");
  });

  it("lays every field the form edits over the stored hero", async () => {
    const stored = playedHero();
    const form = formFor(stored, {
      email: "new@example.com",
      passcode: "9876",
      avatar: "010-gamer",
      favoriteThing: "Robots",
      favoriteFood: "Tacos",
      jobClass: "Mage",
      isAdult: true,
      look: { ...NEWER_LOOK } as never,
      avatarImage: "data:image/png;base64,NEW",
    });
    const saved = await profileToSave(storageHolding(stored), form);
    expect(saved).toMatchObject({
      email: "new@example.com",
      passcode: "9876",
      avatar: "010-gamer",
      favoriteThing: "Robots",
      favoriteFood: "Tacos",
      jobClass: "Mage",
      isAdult: true,
      look: NEWER_LOOK,
      avatarImage: "data:image/png;base64,NEW",
    });
    expect(saved.equipment).toEqual(stored.equipment);
  });

  it("keeps the stored look when the form holds none", async () => {
    const stored = playedHero();
    const form = formFor(stored, { look: undefined, avatarImage: undefined });
    const saved = await profileToSave(storageHolding(stored), form);
    expect(saved.look).toEqual(LOOK);
    expect(saved.avatarImage).toBe("data:image/png;base64,OLD");
  });

  it("reads the stored hero again at save time, so what was earned while the form was open survives", async () => {
    const openedWith = playedHero();
    const stored = { ...playedHero(), inventory: [{ itemId: "potion", quantity: 9 }] };
    const saved = await profileToSave(storageHolding(stored), formFor(openedWith), openedWith);
    expect(saved.inventory).toEqual([{ itemId: "potion", quantity: 9 }]);
  });

  it("falls back to the hero the form was opened with when storage has none or cannot be read", async () => {
    const openedWith = playedHero();
    const missing = await profileToSave(storageHolding(), formFor(openedWith, { favoriteFood: "Soup" }), openedWith);
    expect(missing.equipment).toEqual(openedWith.equipment);
    expect(missing.favoriteFood).toBe("Soup");

    const broken = { get: jest.fn().mockRejectedValue(new Error("db down")), newProfile: jest.fn() };
    const unread = await profileToSave(broken, formFor(openedWith), openedWith);
    expect(unread.inventory).toEqual(openedWith.inventory);
    expect(broken.newProfile).not.toHaveBeenCalled();
  });

  it("leaves the stored record alone: the merge returns a new object", () => {
    const stored = playedHero();
    const before = JSON.stringify(stored);
    const saved = mergeProfileEdit(stored, formFor(stored, { name: { full: "Someone Else" } }));
    expect(saved).not.toBe(stored);
    expect(JSON.stringify(stored)).toBe(before);
  });

  it("does not turn a missing email or passcode into a missing field", () => {
    const stored = { ...playedHero(), email: undefined, passcode: undefined };
    const saved = mergeProfileEdit(stored, formFor(stored, { email: undefined, passcode: undefined }));
    expect(saved.email).toBe("");
    expect(saved.passcode).toBe("");
  });

  it("does not lock a legacy hero: unlockedItems stays missing when it was missing", async () => {
    const { unlockedItems, ...legacy } = playedHero();
    expect(unlockedItems).toBeDefined();
    const saved = await profileToSave(storageHolding(legacy), formFor(legacy));
    expect("unlockedItems" in saved).toBe(false);
  });
});

describe("saving a brand-new hero", () => {
  const newForm = (changes: Partial<ProfileFormValues> = {}): ProfileFormValues => ({
    id: "",
    email: "",
    passcode: "4321",
    name: { full: "Alex Kim aka Lex" },
    avatar: "001-gamer",
    favoriteThing: "Cats",
    favoriteFood: "Noodles",
    jobClass: "Ranger",
    isAdult: false,
    stats: new Stats(),
    ...changes,
  });

  it("builds the record with new User, as before", async () => {
    const storage = storageHolding();
    const saved = await profileToSave(storage, newForm());

    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.newProfile).toHaveBeenCalledTimes(1);
    // Spread into a plain record, as the form always did, so the look can be added next to it
    expect(Object.getPrototypeOf(saved)).toBe(Object.prototype);
    expect(typeof saved.id).toBe("string");
    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved).toMatchObject({
      email: "",
      passcode: "4321",
      avatar: "001-gamer",
      favoriteThing: "Cats",
      favoriteFood: "Noodles",
      jobClass: "Ranger",
      isAdult: false,
      unlockedItems: [],
    });
    expect(saved.name).toMatchObject({ full: "Alex Kim aka Lex", first: "Alex", last: "Kim", nick: "Lex" });
    expect(saved.stats).toBeInstanceOf(Stats);
    expect(saved.stats.xp).toEqual({ now: 0, next_level: 100, ledger: [] });
    expect(Object.keys(saved).sort()).toEqual(
      [
        "avatar", "birthday", "email", "favoriteFood", "favoriteThing", "id", "isAdult", "jobClass",
        "name", "passcode", "stats", "unlockedItems",
      ].sort()
    );
  });

  it("adds the 3D look and its picture by hand, because new User drops them", async () => {
    const saved = await profileToSave(
      storageHolding(),
      newForm({ look: { ...LOOK } as never, avatarImage: "data:image/png;base64,FACE" })
    );
    expect(saved.look).toEqual(LOOK);
    expect(saved.avatarImage).toBe("data:image/png;base64,FACE");
  });

  it("keeps an id the form was given, even when nothing is stored under it yet", async () => {
    const saved = await profileToSave(storageHolding(), newForm({ id: "chosen-id" }));
    expect(saved.id).toBe("chosen-id");
    expect(saved.unlockedItems).toEqual([]);
  });
});
