import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SupportedLanguage } from '../types';
import { supportedLanguages } from './constants';

// Importa diretamente os arquivos de tradução
import ptBR from './strings.br.json';
import en from './strings.en.json';
import pt from './strings.pt.json';
import es from './strings.es.json';
import fr from './strings.fr.json';
import de from './strings.de.json';
import it from './strings.it.json';
import ja from './strings.ja.json';
import zh from './strings.cn.json';

const resources = {
  'pt-BR': { translation: ptBR },
  'en': { translation: en },
  'pt': { translation: pt },
  'es': { translation: es },
  'fr': { translation: fr },
  'de': { translation: de },
  'it': { translation: it },
  'ja': { translation: ja },
  'zh': { translation: zh },
};

const initI18n = (loadPath: string, selectedLanguage: SupportedLanguage) => {
  // Se já foi inicializado, apenas muda o idioma
  if (i18n.isInitialized) {
    return i18n.changeLanguage(selectedLanguage);
  }

  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: selectedLanguage,
      fallbackLng: 'pt-BR',
      supportedLngs: supportedLanguages,
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: false,
      },
    });
};

export default initI18n;
