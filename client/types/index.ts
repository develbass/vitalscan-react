export type SupportedLanguage = 'en' | 'ja' | 'zh' | 'es' | 'pt' | 'it' | 'fr' | 'de' | 'pt-BR';

export interface WMSConfig {
    apiBaseUrl?: string;
    configId?: string;
    theme?: {
      primary?: string;
      secondary?: string;
      backgroundColor?: string;
      textColor?: string;
      buttonColor?: string;
      accentColor?: string;
      title?: string;
      boxShadow?: string;
    };
    api?: {
      apiUrl?: string;
      licenseKey?: string;
      appName?: string;
      appIdentifier?: string;
      appVersion?: string;
    };
    encryption?: {
      privateKey?: string;
      wmsPublicKey?: string;
      rsaPublicKey?: string;
    };
    environments?: {
      API_URL?: string;
      RPDADMIN_TOKEN?: string;
      TEMA_URL?: string;
      RPD_CLIENTID?: string;
    };
    onError?: (error: string) => void;
    onSuccess?: (data: any) => void;
  }
