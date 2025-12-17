import { proxy } from 'valtio';
import { GeneralState } from './types';
import i18n from 'i18next';
import { getSavedLanguage, getSavedTheme } from '../../utils/localStorage';
import { supportedLanguages } from '../../language/constants';
import { SupportedLanguage } from '../../types';

const savedTheme = getSavedTheme();
// Força pt-BR como idioma padrão, ignorando qualquer valor salvo
const initialLanguage: SupportedLanguage = 'pt-BR';
// Salva pt-BR no localStorage para garantir consistência
if (typeof window !== 'undefined') {
  localStorage.setItem('language', initialLanguage);
}

const generalState: GeneralState = proxy({
  theme: savedTheme,
  setTheme: (theme) => {
    generalState.theme = theme;
    localStorage.setItem('theme', theme);
  },
  language: initialLanguage,
  setLanguage: (language) => {
    generalState.language = language;
    if (language === null) {
      localStorage.setItem('language', 'null');
    } else {
      localStorage.setItem('language', language);
      i18n.changeLanguage(language);
    }
  },
});

export default generalState;
