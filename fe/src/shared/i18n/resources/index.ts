import enUS from "./en-US";
import ptPT from "./pt-PT";
import esES from "./es-ES";
import itIT from "./it-IT";
import type { AppLocale } from "../locales";

export type TranslationDictionary = typeof enUS;
export type TranslationValue = string | { [key: string]: TranslationValue };

export const translationResources: Record<AppLocale, TranslationDictionary> = {
  "en-US": enUS,
  "pt-PT": ptPT,
  "es-ES": esES,
  "it-IT": itIT,
};
