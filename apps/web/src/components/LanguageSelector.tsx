import { useI18n } from '../i18n';
import { type Language, languageOptions } from '../i18n/translations';

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="language-selector">
      <label htmlFor="language-select" className="visually-hidden">
        {t('language.label')}
      </label>
      <span className="language-icon" aria-hidden="true">🌐</span>
      <select
        id="language-select"
        value={lang}
        onChange={(event) => setLang(event.target.value as Language)}
        aria-label={t('language.label')}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
