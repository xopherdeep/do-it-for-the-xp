export type SupportedLocale =
  | "en"
  | "zh"
  | "hi"
  | "es"
  | "fr"
  | "ar"
  | "bn"
  | "pt"
  | "ru"
  | "ja"
  | "de";

export interface LocaleOption {
  readonly code: SupportedLocale;
  readonly label: string;
  readonly nativeLabel: string;
}

export type TranslationParams = Record<string, string | number>;

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}
