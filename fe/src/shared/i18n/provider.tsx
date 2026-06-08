import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  getInitialLocale,
  normalizeLocale,
} from "./locales";
import { translationResources, type TranslationDictionary, type TranslationValue } from "./resources";

type TranslationParams = Record<string, number | string>;

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: string | null | undefined) => void;
  t: (key: string, params?: TranslationParams) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const originalTextNodes = new WeakMap<Text, string>();

const flattenTranslations = (
  value: TranslationValue,
  path: string[] = [],
  output: Record<string, string> = {},
) => {
  if (typeof value === "string") {
    output[path.join(".")] = value;
    return output;
  }

  Object.entries(value).forEach(([key, childValue]) => {
    flattenTranslations(childValue, [...path, key], output);
  });

  return output;
};

const buildAutoTranslationMap = (locale: AppLocale) => {
  const source = flattenTranslations(translationResources[DEFAULT_LOCALE]);
  const target = flattenTranslations(translationResources[locale]);
  const map = new Map<string, string>();

  Object.entries(source).forEach(([key, englishText]) => {
    const translatedText = target[key];
    if (translatedText && translatedText !== englishText) {
      map.set(englishText, translatedText);
    }
  });

  return map;
};

const translateDomText = (root: ParentNode, locale: AppLocale) => {
  const translationMap = buildAutoTranslationMap(locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    const current = node.textContent ?? "";
    const original = originalTextNodes.get(node) ?? current;
    originalTextNodes.set(node, original);

    const trimmed = original.trim();
    const translated = locale === DEFAULT_LOCALE ? trimmed : translationMap.get(trimmed);
    if (!translated) {
      if (locale === DEFAULT_LOCALE && current !== original) node.textContent = original;
      return;
    }

    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    node.textContent = `${leading}${translated}${trailing}`;
  });

  const translatableAttributes = ["placeholder", "aria-label", "title"] as const;
  document.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]").forEach((element) => {
    translatableAttributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;

      const storageAttribute = `data-bo-i18n-original-${attribute}`;
      const original = element.getAttribute(storageAttribute) ?? current;
      if (!element.hasAttribute(storageAttribute)) element.setAttribute(storageAttribute, original);

      const translated = locale === DEFAULT_LOCALE ? original : translationMap.get(original);
      if (translated) element.setAttribute(attribute, translated);
    });
  });
};

const resolveTranslation = (
  dictionary: TranslationDictionary,
  key: string,
): TranslationValue | null => {
  return key.split(".").reduce<TranslationValue | null>((currentValue, part) => {
    if (!currentValue || typeof currentValue === "string") return null;
    return currentValue[part] ?? null;
  }, dictionary);
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) return template;

  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, token: string) => {
    const replacement = params[token];
    return replacement === undefined ? `{{${token}}}` : String(replacement);
  });
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [locale, setLocaleState] = useState<AppLocale>(() => getInitialLocale());

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const run = () => translateDomText(document.body, locale);
    const frame = window.requestAnimationFrame(run);
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(run);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale]);

  const setLocale = useCallback((nextLocale: string | null | undefined) => {
    setLocaleState(normalizeLocale(nextLocale) ?? DEFAULT_LOCALE);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const activeDictionary = translationResources[locale];
      const fallbackDictionary = translationResources[DEFAULT_LOCALE];
      const translatedValue =
        resolveTranslation(activeDictionary, key) ?? resolveTranslation(fallbackDictionary, key);

      if (typeof translatedValue !== "string") return key;
      return interpolate(translatedValue, params);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (value: number, currency = "EUR", options?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          currencyDisplay: "narrowSymbol",
          ...options,
        }).format(value);
      } catch {
        return `${currency} ${value.toLocaleString()}`;
      }
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(locale, options).format(value);
      } catch {
        return value.toString();
      }
    },
    [locale],
  );

  const formatDate = useCallback(
    (value: number | string | Date, options?: Intl.DateTimeFormatOptions) => {
      try {
        return new Intl.DateTimeFormat(locale, options).format(new Date(value));
      } catch {
        return new Date(value).toLocaleString();
      }
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
    }),
    [formatCurrency, formatDate, formatNumber, locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
};
