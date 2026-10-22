import { useTownHallClerk } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallClerk";

const mockSendQueue = jest.fn();
const mockDeskRefresh = jest.fn();
const mockOfferRegistration = jest.fn();
const mockLink = {
  loadLink: jest.fn(),
  removeLink: jest.fn(),
  openAuthorizePage: jest.fn(),
  completeReturn: jest.fn(),
};
let mockLinkOptions: { announce(result: string): Promise<void> };
let mockPostingOptions: { registerFamily(): Promise<void>; desk: { changed(what: string): void } };

jest.mock("@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallPosting", () => ({
  useTownHallPosting: (options: { registerFamily(): Promise<void>; desk: { changed(what: string): void } }) => {
    mockPostingOptions = options;
    return { sendQueue: mockSendQueue };
  },
}));
jest.mock("@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk", () => ({
  useTownHallDesk: () => ({
    state: {},
    actions: { refresh: mockDeskRefresh },
    writer: { createNews: jest.fn(), saveEdit: jest.fn(), readWords: jest.fn() },
  }),
}));
jest.mock("@/app/Console/MyPortal/HomeTown/TownHall/components/registrationOffer", () => ({
  registrationOffer: () => mockOfferRegistration,
}));
jest.mock("@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallLink", () => ({
  useTownHallLink: (options: { announce(result: string): Promise<void> }) => {
    mockLinkOptions = options;
    return mockLink;
  },
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const showPrompt = jest.fn();
const store = {
  activeLink: null as null | { displayName: string },
  signedInThroughWebsite: false,
  refreshPowers: jest.fn(),
};
const reloadTab = jest.fn();

const build = () =>
  useTownHallClerk({
    store: store as never,
    reveal: { showPrompt, prompt: { value: null } } as never,
    userId: () => "hero1",
    heroName: () => "Nick",
    isGameMaster: () => true,
    route: () => "/town-hall/hero1",
    currentBoard: () => "general" as never,
    profilesReady: async () => undefined,
    reloadTab,
  });

beforeEach(() => {
  jest.clearAllMocks();
  store.activeLink = null;
  showPrompt.mockResolvedValue("");
  mockLink.loadLink.mockResolvedValue(undefined);
  mockLink.removeLink.mockResolvedValue("unlinked");
});

describe("useTownHallClerk", () => {
  it("offers registration on an ordinary visit and sends the queue", async () => {
    mockLink.completeReturn.mockResolvedValue(false);
    await build().completeLinkReturn();
    expect(mockSendQueue).toHaveBeenCalled();
    expect(mockOfferRegistration).toHaveBeenCalled();
  });

  it("does not offer registration on a return from WordPress, but still sends the queue", async () => {
    mockLink.completeReturn.mockResolvedValue(true);
    await build().completeLinkReturn();
    expect(mockSendQueue).toHaveBeenCalled();
    expect(mockOfferRegistration).not.toHaveBeenCalled();
  });

  it("refreshes the powers and the desk before sending the queue on a return", async () => {
    const calls: string[] = [];
    store.refreshPowers.mockImplementationOnce(async () => {
      calls.push("powers");
    });
    mockDeskRefresh.mockImplementationOnce(async () => {
      calls.push("desk");
    });
    mockSendQueue.mockImplementationOnce(() => {
      calls.push("queue");
    });
    mockLink.completeReturn.mockResolvedValue(false);
    await build().completeLinkReturn();
    expect(calls).toEqual(["powers", "desk", "queue"]);
  });

  it("reloads the tabs a desk change touches", () => {
    build();
    const { changed } = mockPostingOptions.desk;
    changed("post");
    expect(reloadTab.mock.calls).toEqual([["news"], ["updates"]]);
    reloadTab.mockClear();
    changed("topic");
    expect(reloadTab.mock.calls).toEqual([["board"]]);
    reloadTab.mockClear();
    changed("patch-notes");
    expect(reloadTab.mock.calls).toEqual([["updates"]]);
    reloadTab.mockClear();
    changed("news");
    expect(reloadTab.mock.calls).toEqual([["news"]]);
  });

  it("unlinks a registered family when the parent picks unlink", async () => {
    store.activeLink = { displayName: "Pollards" };
    showPrompt.mockResolvedValueOnce("unlink");
    await build().registerFamily();
    expect(mockLink.removeLink).toHaveBeenCalled();
  });

  it("keeps the link when the parent picks anything else", async () => {
    store.activeLink = { displayName: "Pollards" };
    showPrompt.mockResolvedValueOnce("close");
    await build().registerFamily();
    expect(mockLink.removeLink).not.toHaveBeenCalled();
  });

  it("goes to the authorize page for a family that has an account", async () => {
    showPrompt.mockResolvedValueOnce("have");
    await build().registerFamily();
    expect(mockLink.openAuthorizePage).toHaveBeenCalled();
  });

  it("opens the signup page for a family that needs an account", async () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    showPrompt.mockResolvedValueOnce("create");
    await build().registerFamily();
    expect(open).toHaveBeenCalledWith(expect.any(String), "_blank", "noopener");
    expect(mockLink.openAuthorizePage).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("announces a new link by sending the queue and showing the notice", async () => {
    build();
    await mockLinkOptions.announce("linked");
    expect(mockSendQueue).toHaveBeenCalled();
    expect(showPrompt).toHaveBeenCalledTimes(1);
  });

  it("says nothing when the registration is unchanged", async () => {
    build();
    await mockLinkOptions.announce("none");
    expect(mockSendQueue).not.toHaveBeenCalled();
    expect(showPrompt).not.toHaveBeenCalled();
  });

  it("hands posting a registerFamily that reaches the same errand", async () => {
    showPrompt.mockResolvedValueOnce("have");
    build();
    await mockPostingOptions.registerFamily();
    expect(mockLink.openAuthorizePage).toHaveBeenCalled();
  });
});
