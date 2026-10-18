/** How long a Blob URL is kept after its download starts */
const OBJECT_URL_LIFETIME_MS = 60_000;

/** Hand the browser a text file to save, as BackupService does for a backup. */
export function downloadTextFile(fileName: string, text: string, type = "application/json"): void {
  // A Blob URL has no size limit; a data: URL stops working in some browsers at about 2 MB
  const useBlob = typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  const href = useBlob ? URL.createObjectURL(new Blob([text], { type })) : `data:${type};charset=utf-8,${encodeURIComponent(text)}`;
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (useBlob) setTimeout(() => URL.revokeObjectURL(href), OBJECT_URL_LIFETIME_MS);
}

/** Ask for one file. Null when the picker is closed (browsers that send no "cancel" event just never answer) */
export function pickTextFile(accept = "application/json,.json"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });
