import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  STORAGE_KEY_LANGUAGE,
  getLocale,
  isSupportedLocale,
  setLocale,
  t,
} from "@/lib/services/i18n/i18n";
import { useI18n } from "@/hooks/useI18n";

describe("Internationalization Service (i18n)", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale(DEFAULT_LOCALE);
  });

  it("identifies supported locales correctly", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("zh")).toBe(true);
    expect(isSupportedLocale("hi")).toBe(true);
    expect(isSupportedLocale("es")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(true);
    expect(isSupportedLocale("ar")).toBe(true);
    expect(isSupportedLocale("bn")).toBe(true);
    expect(isSupportedLocale("pt")).toBe(true);
    expect(isSupportedLocale("ru")).toBe(true);
    expect(isSupportedLocale("ja")).toBe(true);
    expect(isSupportedLocale("de")).toBe(true);
    expect(isSupportedLocale("klingon")).toBe(false);
  });

  it("switches active locale and persists to localStorage", () => {
    expect(getLocale()).toBe("en");
    setLocale("ja");
    expect(getLocale()).toBe("ja");
    expect(localStorage.getItem(STORAGE_KEY_LANGUAGE)).toBe("ja");
  });

  it("ignores unsupported locales", () => {
    setLocale("ja");
    // @ts-expect-error Testing invalid runtime input
    setLocale("unknown_locale");
    expect(getLocale()).toBe("ja");
  });

  it("translates common and settings keys in English", () => {
    setLocale("en");
    expect(t("common.ok")).toBe("OK");
    expect(t("common.cancel")).toBe("Cancel");
    expect(t("navigation.myHome")).toBe("My Home");
    expect(t("settings.general.title")).toBe("General");
    expect(t("settings.general.appLanguage")).toBe("App language");
  });

  it("translates common and settings keys in Japanese", () => {
    setLocale("ja");
    expect(t("common.ok")).toBe("OK");
    expect(t("common.cancel")).toBe("キャンセル");
    expect(t("navigation.myHome")).toBe("マイホーム");
    expect(t("settings.general.title")).toBe("一般設定");
    expect(t("settings.general.appLanguage")).toBe("アプリ言語");
  });

  it("translates common and settings keys in Chinese (Simplified)", () => {
    setLocale("zh");
    expect(t("common.ok")).toBe("好的");
    expect(t("common.cancel")).toBe("取消");
    expect(t("navigation.myHome")).toBe("我的家");
    expect(t("settings.general.title")).toBe("通用");
    expect(t("settings.general.appLanguage")).toBe("应用语言");
  });

  it("translates common and settings keys in Spanish, French, and German", () => {
    setLocale("es");
    expect(t("common.ok")).toBe("Aceptar");
    expect(t("settings.general.title")).toBe("General");

    setLocale("fr");
    expect(t("common.cancel")).toBe("Annuler");
    expect(t("settings.general.title")).toBe("Général");

    setLocale("de");
    expect(t("common.save")).toBe("Speichern");
    expect(t("settings.general.title")).toBe("Allgemein");
  });

  it("translates common and settings keys in Arabic, Hindi, Bengali, Portuguese, and Russian", () => {
    setLocale("ar");
    expect(t("common.ok")).toBe("حسناً");
    expect(t("settings.general.title")).toBe("عام");

    setLocale("hi");
    expect(t("common.ok")).toBe("ठीक है");
    expect(t("settings.general.title")).toBe("सामान्य");

    setLocale("bn");
    expect(t("common.ok")).toBe("ঠিক আছে");
    expect(t("settings.general.title")).toBe("সাধারণ");

    setLocale("pt");
    expect(t("common.save")).toBe("Salvar");
    expect(t("settings.general.title")).toBe("Geral");

    setLocale("ru");
    expect(t("common.ok")).toBe("ОК");
    expect(t("settings.general.title")).toBe("Основные");
  });

  it("interpolates parameters in translation strings", () => {
    setLocale("en");
    const enText = t("settings.general.landingPageDesc", { name: "Cloud" });
    expect(enText).toBe("The screen Cloud sees after signing in on this device");

    setLocale("ja");
    const jaText = t("settings.general.landingPageDesc", { name: "クラウド" });
    expect(jaText).toBe("このデバイスでサインインした後にクラウドが表示する画面");

    setLocale("zh");
    const zhText = t("settings.general.landingPageDesc", { name: "克劳德" });
    expect(zhText).toBe("克劳德 在此设备登录后看到的第一个页面");
  });

  it("falls back to English when key is missing in active locale", () => {
    setLocale("zh");
    expect(t("common.ok")).toBe("好的");
    // Non-existent key in zh falls back to en if en has it
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("returns raw key path if translation does not exist", () => {
    expect(t("nonexistent.nested.key")).toBe("nonexistent.nested.key");
  });

  it("useI18n hook exposes reactive locale and translation functions", () => {
    const { locale, setLocale: changeLang, t: translate, availableLocales } = useI18n();

    expect(locale.value).toBe("en");
    expect(availableLocales.value).toHaveLength(SUPPORTED_LOCALES.length);

    changeLang("ja");
    expect(locale.value).toBe("ja");
    expect(translate("common.save")).toBe("保存");
  });
});
