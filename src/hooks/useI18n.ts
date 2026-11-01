import { computed } from "vue";
import {
  activeLocale,
  setLocale,
  getLocale,
  t,
  SUPPORTED_LOCALES,
} from "@/lib/services/i18n/i18n";
import type { SupportedLocale, LocaleOption } from "@/lib/services/i18n/types";

export const useI18n = () => {
  const currentLocale = computed((): SupportedLocale => activeLocale.value);
  const availableLocales = computed((): readonly LocaleOption[] => SUPPORTED_LOCALES);
  const changeLocale = (code: SupportedLocale): void => {
    setLocale(code);
  };

  return {
    t,
    locale: currentLocale,
    getLocale,
    setLocale: changeLocale,
    availableLocales,
  };
};

export type { SupportedLocale, LocaleOption };
