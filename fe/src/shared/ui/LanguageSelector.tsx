import { LOCALE_OPTIONS } from "@/shared/i18n";
import { useI18n } from "@/shared/i18n";
import "./languageSelector.css";

interface LanguageSelectorProps {
  compact?: boolean;
}

export default function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`language-selector${compact ? " language-selector--compact" : ""}`}>
      <i className="bi bi-globe2" aria-hidden="true" />
      <span className="language-selector__label">{t("common.language")}</span>
      <select
        value={locale}
        aria-label={t("common.language")}
        onChange={(event) => setLocale(event.target.value)}
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {compact ? option.shortLabel : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
