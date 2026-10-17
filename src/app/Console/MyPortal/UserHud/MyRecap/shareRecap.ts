import { Share } from "@capacitor/share";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
import debug from "@/lib/utils/debug";

export type ShareOutcome = "shared" | "copied" | "failed" | "dismissed";

/** Whether an error means the person simply closed the share sheet */
const isDismissal = (error: unknown): boolean => {
  const text = `${(error as { name?: string })?.name || ""} ${(error as { message?: string })?.message || ""}`;
  return /abort|cancel/i.test(text);
};

/**
 * Hand `text` to the share sheet: Capacitor's Share on a device, else the browser's own `navigator.share`, else the
 * clipboard. Closing the sheet is "dismissed" (no copy behind the person's back); only a refusal falls through.
 */
export const shareRecapText = async (title: string, text: string): Promise<ShareOutcome> => {
  try {
    const { value: canShareNatively } = await Share.canShare();
    if (canShareNatively) {
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    }
  } catch (error) {
    if (isDismissal(error)) return "dismissed";
    debug.warn("recap: the native share failed", error);
  }
  try {
    const canShareInBrowser = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (canShareInBrowser) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (error) {
    if (isDismissal(error)) return "dismissed";
    debug.warn("recap: the browser share failed, copying instead", error);
  }
  return (await copyTextToClipboard(text)) ? "copied" : "failed";
};
