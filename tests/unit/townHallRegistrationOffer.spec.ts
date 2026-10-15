import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { registrationOffer, type RegistrationOfferDeps } from "@/app/Console/MyPortal/HomeTown/TownHall/components/registrationOffer";
import { clerkMenuPrompt, unregisteredOutboxPrompt } from "@/lib/services/hometown/hometownPrompts";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { newPost } from "@/lib/services/townhall/townHallOutbox";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const HERO = { id: "gm-1", name: "a hero" };
const NOW = 1_700_000_000_000;

/** The clerk: a prompt asked stays up until the spec answers it. */
const fakeReveal = () => {
  const prompt = ref<RevealPromptOptions | null>(null);
  const asked: RevealPromptOptions[] = [];
  let answerNow: (id: string) => void = () => undefined;
  const ask = jest.fn(
    (options: RevealPromptOptions) =>
      new Promise<string>((resolve) => {
        asked.push(options);
        prompt.value = options;
        answerNow = (id) => {
          prompt.value = null;
          resolve(id);
        };
      }),
  );
  return { prompt, showPrompt: ask, asked, answer: (id = "ok") => answerNow(id) };
};

/** This device's outbox: posts in these states, linked or not. */
const outbox = (over: { isLinked?: boolean; statuses?: TownHallPost["status"][] } = {}) => ({
  isLinked: over.isLinked ?? false,
  posts: (over.statuses ?? ["queued"]).map((status, i) => ({
    ...newPost({ kind: "bug", body: "The dragon is stuck." }, HERO, true, NOW + i, `w-${i}`),
    status,
  })),
});

const offerFor = (over: Partial<RegistrationOfferDeps> = {}) => {
  const reveal = fakeReveal();
  const register = jest.fn(async () => undefined);
  const offer = registrationOffer({ store: outbox(), reveal, isGameMaster: () => true, registerFamily: register, ...over });
  return { offer, reveal, register };
};

describe("a Game Master who opens the Town Hall with posts waiting and no registration", () => {
  it("is offered Family Registration by the clerk, and 'Family Registration' starts it", async () => {
    const { offer, reveal, register } = offerFor();

    const offering = offer();
    await flushPromises();
    expect(reveal.asked).toEqual([unregisteredOutboxPrompt()]);
    reveal.answer("registration");
    await offering;

    expect(register).toHaveBeenCalledTimes(1);
  });

  it("is offered it once per visit", async () => {
    const { offer, reveal, register } = offerFor();
    const first = offer();
    await flushPromises();
    reveal.answer("never");
    await first;

    await offer();

    expect(reveal.asked).toHaveLength(1);
    expect(register).not.toHaveBeenCalled();
  });

  it("is not asked when the device is registered, when nothing waits to be sent, or when the clerk is already talking", async () => {
    const linked = offerFor({ store: outbox({ isLinked: true }) });
    await linked.offer();
    expect(linked.reveal.asked).toHaveLength(0);

    const onlyAwaiting = offerFor({ store: outbox({ statuses: ["awaiting-gm", "rejected", "failed", "sent"] }) });
    await onlyAwaiting.offer();
    expect(onlyAwaiting.reveal.asked).toHaveLength(0);

    const reveal = fakeReveal();
    reveal.prompt.value = clerkMenuPrompt(true);
    const busy = registrationOffer({ store: outbox(), reveal, isGameMaster: () => true, registerFamily: jest.fn(async () => undefined) });
    await busy();
    expect(reveal.asked).toHaveLength(0);
  });

  it("waits for the device's profiles first: on a cold start the Game Master is not known until they are read", async () => {
    let profilesRead = false;
    let readProfiles: () => void = () => undefined;
    const { offer, reveal } = offerFor({
      isGameMaster: () => profilesRead,
      profilesReady: () =>
        new Promise<void>((resolve) => {
          readProfiles = () => {
            profilesRead = true;
            resolve();
          };
        }),
    });

    const offering = offer();
    await flushPromises();
    expect(reveal.asked).toHaveLength(0);
    readProfiles();
    await flushPromises();
    expect(reveal.asked).toEqual([unregisteredOutboxPrompt()]);
    reveal.answer("never");
    await offering;
  });

  it("is never something a hero is asked", async () => {
    const { offer, reveal } = offerFor({ isGameMaster: () => false });
    await offer();
    expect(reveal.asked).toHaveLength(0);
  });
});
