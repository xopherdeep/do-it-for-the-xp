import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { NATIVE_RETURN_URL, searchOf } from "./townHallLink";

/** Whether an address the system opened in the app is the Town Hall's own (not `town-hall-something`, not another scheme). */
function isTownHallReturn(url: string): boolean {
  const isOwnScheme = url.startsWith(NATIVE_RETURN_URL);
  if (!isOwnScheme) return false;
  const next = url.charAt(NATIVE_RETURN_URL.length);
  return next === "" || next === "?" || next === "#" || next === "/";
}

/** Put the in-app browser away. Android has no way to close its custom tab, so a failure here is not a problem. */
async function closeBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // chemx-allow: best-effort nothing to close, or nothing that can be closed: the parent is back in the game either way
  }
}

/**
 * Hear WordPress send the parent back from the in-app browser: the system opens the app's own address
 * (`NATIVE_RETURN_URL` plus WordPress's query), and this hands the query on. Any other address is not ours to read.
 * Resolves with the function that stops listening.
 */
export async function listenForTownHallReturn(onReturn: (search: string) => void): Promise<() => void> {
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    if (!isTownHallReturn(url)) return;
    void closeBrowser();
    onReturn(searchOf(url));
  });
  return () => {
    void handle.remove();
  };
}
