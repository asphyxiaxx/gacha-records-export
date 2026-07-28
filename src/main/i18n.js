import log from "electron-log";

const modules = import.meta.glob("../locales/*.json", { eager: true });
const defaultLang = "en-us";
const locales = {};
const localeNames = {};

for (const path in modules) {
  const locale = modules[path].default;
  const localeKey = locale.key;
  if (!localeKey) {
    throw new Error();
  }
  locales[localeKey] = locale;
  localeNames[localeKey] = locale.title ?? localeKey;
}

const localeAliases = {
  zh: "zh-cn",
  "zh-cn": "zh-cn",
  "zh-tw": "zh-tw",
  "de-at": "de-de",
  "de-ch": "de-de",
  "de-de": "de-de",
  de: "de-de",
  "en-au": "en-us",
  "en-ca": "en-us",
  "en-gb": "en-us",
  "en-nz": "en-us",
  "en-us": "en-us",
  "en-za": "en-us",
  en: "en-us",
  es: "es-es",
  "es-419": "es-es",
  "fr-ca": "fr-fr",
  "fr-ch": "fr-fr",
  "fr-fr": "fr-fr",
  fr: "fr-fr",
  id: "id-id",
  ja: "ja-jp",
  ko: "ko-kr",
  "pt-br": "pt-pt",
  "pt-pt": "pt-pt",
  pt: "pt-pt",
  ru: "ru-ru",
  th: "th-th",
  vi: "vi-vn",
};

const cache = {};

function normalizeLocale(input) {
  if (!input) return defaultLang;

  input = input.toLowerCase();
  if (Object.hasOwn(locales, input)) {
    return input;
  }
  return localeAliases[input] || defaultLang;
}

function deepUpdate(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value instanceof Object) {
      deepUpdate((target[key] ??= {}), value);
    } else {
      target[key] = value;
    }
  }
}

class I18NManager {
  data = undefined;

  constructor() {
    this.load(defaultLang);

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          const val = target[prop];
          return typeof val === "function" ? val.bind(target) : val;
        }
        if (target.data && prop in target.data) {
          return target.data[prop];
        }
        return undefined;
      },
    });
  }

  get currentLocale() {
    return this.data?.key;
  }

  get localeNames() {
    return localeNames;
  }

  load(lang) {
    lang = normalizeLocale(lang);

    log.debug(`Setting language '${lang}' from '${this.currentLocale}'...`);

    if (lang == this.currentLocale) {
      log.debug(`Ignore setting language on '${lang}' as it is same`);
      return;
    }

    if (!(lang in cache)) {
      log.debug(`language '${lang}' not in cache, initalizing...`);

      const chain = Array.from(new Set([defaultLang, lang]));
      const data = {};

      for (const code of chain) {
        const locale = locales[code];
        if (locale === undefined) continue;

        deepUpdate(data, locale);
      }

      cache[lang] = data;
    }

    this.data = cache[lang];

    log.debug(`Language initialized: ${this.currentLocale}`);
  }
}

const i18n = new I18NManager();

export default i18n;
