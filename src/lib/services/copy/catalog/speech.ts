/**
 * The read-aloud note: what the dimmed speaker button and the Text style switch say on a device with no reading voice
 * (a desktop pane or webview without speech voices, a phone whose text-to-speech engine has none installed).
 */
import type { CopyCatalog } from "../voices";

export const speech = {
  "speech.noVoice": {
    simple: "No reading voice on this device.",
    adventure: "No reading voice answers on this device.",
    classic: "No reading voice on this device.",
  },
} satisfies CopyCatalog;
