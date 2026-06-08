export const SUPPORTED_LOCALES = ["en-US", "pt-PT", "es-ES", "it-IT"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleOption {
  value: AppLocale;
  label: string;
  shortLabel: string;
}

export const DEFAULT_LOCALE: AppLocale = "en-US";
export const LOCALE_STORAGE_KEY = "bo_locale";

export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: "en-US", label: "English", shortLabel: "EN" },
  { value: "pt-PT", label: "Português", shortLabel: "PT" },
  { value: "es-ES", label: "Español", shortLabel: "ES" },
  { value: "it-IT", label: "Italiano", shortLabel: "IT" },
];

const LEGACY_LOCALE_MAP: Record<string, AppLocale> = {
  en: "en-US",
  "en-us": "en-US",
  english: "en-US",
  ingles: "en-US",
  pt: "pt-PT",
  "pt-pt": "pt-PT",
  portuguese: "pt-PT",
  portugues: "pt-PT",
  português: "pt-PT",
  es: "es-ES",
  "es-es": "es-ES",
  spanish: "es-ES",
  espanhol: "es-ES",
  español: "es-ES",
  it: "it-IT",
  "it-it": "it-IT",
  italian: "it-IT",
  italiano: "it-IT",
};

export const normalizeLocale = (value: string | null | undefined): AppLocale | null => {
  if (!value) return null;

  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const directMatch = SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === normalizedValue.toLowerCase(),
  );

  return directMatch ?? LEGACY_LOCALE_MAP[normalizedValue.toLowerCase()] ?? null;
};

export const getInitialLocale = (): AppLocale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const storedLocale = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  return storedLocale ?? DEFAULT_LOCALE;
};
