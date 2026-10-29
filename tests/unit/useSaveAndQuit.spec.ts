import { createPinia, setActivePinia } from "pinia";
import { useSaveAndQuit } from "@/hooks/useSaveAndQuit";
import { useUserStore } from "@/lib/store/stores/user";
import { play$fx } from "@/assets/fx";

const mockReplace = jest.fn();
jest.mock("vue-router", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("@/assets/fx", () => ({ play$fx: jest.fn() }));

describe("Save & Quit flow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockReplace.mockReset();
    (play$fx as jest.Mock).mockReset();
  });

  it("opens with the menu sound", () => {
    const flow = useSaveAndQuit();
    flow.open();
    expect(flow.isOpen.value).toBe(true);
    expect(play$fx).toHaveBeenCalledWith("openMenu");
  });

  it("cancel closes quietly and keeps the hero signed in", async () => {
    const userStore = useUserStore();
    userStore.currentUser.isAuthenticated = true;
    const flow = useSaveAndQuit();
    flow.open();
    (play$fx as jest.Mock).mockReset();
    flow.cancel();
    expect(flow.isOpen.value).toBe(false);
    expect(play$fx).not.toHaveBeenCalled();
    expect(userStore.currentUser.isAuthenticated).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("confirm signs out and leaves once, even when tapped twice", async () => {
    const userStore = useUserStore();
    userStore.currentUser.isAuthenticated = true;
    const flow = useSaveAndQuit();
    flow.open();
    await Promise.all([flow.confirm(), flow.confirm()]);
    expect(userStore.currentUser.isAuthenticated).toBe(false);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({ name: "xp-profile" });
    expect(play$fx).toHaveBeenCalledWith("select");
  });

  it("the close event after a confirm does nothing more", async () => {
    const flow = useSaveAndQuit();
    flow.open();
    await flow.confirm();
    flow.cancel();
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
