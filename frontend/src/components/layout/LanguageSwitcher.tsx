import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  // Normalize checking because detector might return full locales like 'es-ES' or 'pt-PT'
  const currentLang = i18n.language?.startsWith('pt') ? 'pt' : 'es';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-1 font-mono text-xs uppercase select-none tracking-widest font-black">
      <button
        type="button"
        onClick={() => toggleLanguage('es')}
        className={`px-2 py-1 transition-colors duration-150 cursor-pointer ${
          currentLang === 'es' 
            ? 'text-white border-b-2 border-white' 
            : 'text-white/30 hover:text-white/70'
        }`}
      >
        ES
      </button>
      <span className="text-white/10 flex-shrink-0">·</span>
      <button
        type="button"
        onClick={() => toggleLanguage('pt')}
        className={`px-2 py-1 transition-colors duration-150 cursor-pointer ${
          currentLang === 'pt' 
            ? 'text-white border-b-2 border-white' 
            : 'text-white/30 hover:text-white/70'
        }`}
      >
        PT
      </button>
    </div>
  );
}
