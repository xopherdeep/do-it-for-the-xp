import debug from "@/lib/utils/debug";

/**
 * Safely copy text to clipboard across secure (HTTPS/localhost) and non-secure (HTTP LAN) contexts.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API if supported in a secure context
  const canUseClipboardApi = typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext;
  if (canUseClipboardApi) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fall through to textarea fallback
      debug.warn("[clipboard] the Clipboard API refused, using the textarea fallback", error);
    }
  }

  // Fallback for non-secure contexts (e.g. mobile LAN IP over HTTP)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
