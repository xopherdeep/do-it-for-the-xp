/** The last file's Blob URL, let go when the next one is made (a timer would outlive the page that set it) */
let lastObjectUrl: string | null = null;

/** Hand the browser a text file to save, as BackupService does for a backup. */
export function downloadTextFile(fileName: string, text: string, type = "application/json"): void {
  // A Blob URL has no size limit; a data: URL stops working in some browsers at about 2 MB
  const useBlob = typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  const href = useBlob ? URL.createObjectURL(new Blob([text], { type })) : `data:${type};charset=utf-8,${encodeURIComponent(text)}`;
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  lastObjectUrl = useBlob ? href : null;
}

/** Ask for one file. Null when the picker is closed (browsers that send no "cancel" event just never answer) */
export function pickTextFile(accept = "application/json,.json"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
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
