import { useEffect, useState } from 'react';
import { SupportedLanguage } from '../types';
import { supportedLanguages } from '../language/constants';
import initI18n from '../language/i18n';
import state from '../state';
import i18n from 'i18next';

/**
 * Initializes i18n with pt-BR as default language.
 */
export const useInitializeLanguage = (): boolean => {
  const [isLangInitialized, setIsLangInitialized] = useState(false);

  useEffect(() => {
    // Força pt-BR como padrão
    const lng: SupportedLanguage = 'pt-BR';
    
    // Salva no localStorage
    localStorage.setItem('language', lng);

    // Inicializa o i18n (os recursos já estão carregados via import)
    initI18n('', lng).then(() => {
      setIsLangInitialized(true);
      state.general.setLanguage(lng);
      console.log('[i18n] Inicializado com idioma:', lng);
      console.log('[i18n] Idioma atual do i18n:', i18n.language);
    }).catch((error) => {
      console.error('[i18n] Erro ao inicializar:', error);
      setIsLangInitialized(true);
    });
  }, []);

  return isLangInitialized;
};

export default useInitializeLanguage;
