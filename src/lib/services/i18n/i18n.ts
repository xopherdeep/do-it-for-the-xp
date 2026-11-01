import { ref } from "vue";
import { SupportedLocale, LocaleOption, TranslationDictionary, TranslationParams } from "./types";
import { en } from "./locales/en";
import { zh } from "./locales/zh";
import { hi } from "./locales/hi";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";
import { bn } from "./locales/bn";
import { pt } from "./locales/pt";
import { ru } from "./locales/ru";
import { ja } from "./locales/ja";
import { de } from "./locales/de";

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const STORAGE_KEY_LANGUAGE = "xp.language";

export const SUPPORTED_LOCALES: readonly LocaleOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
];

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  bn,
  pt,
  ru,
  ja,
  de,
};

export const isSupportedLocale = (val: unknown): val is SupportedLocale => {
  const isMatch = (opt: LocaleOption): boolean => opt.code === val;
  return SUPPORTED_LOCALES.some(isMatch);
};

const readStorage = (key: string): string | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // chemx-allow: best-effort storage in blocked environments
  }
};

export const resolveInitialLocale = (): SupportedLocale => {
  const stored = readStorage(STORAGE_KEY_LANGUAGE);
  const hasValidStored = isSupportedLocale(stored);
  if (hasValidStored) {
    return stored;
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const navCode = navigator.language.slice(0, 2).toLowerCase();
    const isNavSupported = isSupportedLocale(navCode);
    if (isNavSupported) {
      return navCode;
    }
  }

  return DEFAULT_LOCALE;
};

export const activeLocale = ref<SupportedLocale>(resolveInitialLocale());

export const setLocale = (locale: SupportedLocale): void => {
  const isValid = isSupportedLocale(locale);
  if (!isValid) return;

  activeLocale.value = locale;
  writeStorage(STORAGE_KEY_LANGUAGE, locale);
};

export const getLocale = (): SupportedLocale => activeLocale.value;

const extractPathValue = (dict: TranslationDictionary, segments: string[]): string | undefined => {
  let current: string | TranslationDictionary | undefined = dict;
  for (const segment of segments) {
    const isCurrentObject = Boolean(current) && typeof current === "object";
    if (!isCurrentObject) {
      return undefined;
    }
    current = (current as TranslationDictionary)[segment];
  }
  const isStringResult = typeof current === "string";
  return isStringResult ? (current as string) : undefined;
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) return template;
  let text = template;
  for (const [key, value] of Object.entries(params)) {
    const pattern = new RegExp(`\\{${key}\\}`, "g");
    text = text.replace(pattern, String(value));
  }
  return text;
};

export const t = (path: string, params?: TranslationParams): string => {
  const segments = path.split(".");
  const currentLang = activeLocale.value;
  const currentDict = dictionaries[currentLang];

  const primaryValue = currentDict ? extractPathValue(currentDict, segments) : undefined;
  if (primaryValue !== undefined) {
    return interpolate(primaryValue, params);
  }

  const isNotEnglish = currentLang !== "en";
  if (isNotEnglish) {
    const fallbackValue = extractPathValue(dictionaries.en, segments);
    if (fallbackValue !== undefined) {
      return interpolate(fallbackValue, params);
    }
  }

  return path;
};
