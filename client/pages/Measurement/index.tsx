import { useEffect, useState } from 'react';
import MeasurementEmbeddedApp, {
  appEvents,
  type MeasurementEmbeddedAppError,
  type MeasurementEmbeddedAppOptions,
} from '@nuralogix.ai/web-measurement-embedded-app';
import { useNavigate } from 'react-router';
import { useSnapshot } from 'valtio';
import state from '../../state';
import ErrorMessage from './ErrorMessage';
import MeasurementHeader from '../../components/MeasurementHeader';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
  },
});
import { isUiErrorCode, isCancelOnErrorCode } from './constants';

const Measurement = () => {
  const [measurementApp] = useState(() => {
    console.log('[DEBUG] Creating new MeasurementEmbeddedApp instance');
    return new MeasurementEmbeddedApp();
  });
  const { setResults } = useSnapshot(state.measurement);
  const { theme, language } = useSnapshot(state.general);
  const { demographics } = useSnapshot(state.demographics);
  const navigate = useNavigate();
  const [appError, setAppError] = useState<MeasurementEmbeddedAppError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  console.log('[DEBUG] Measurement render - isInitialized:', isInitialized, 'theme:', theme, 'language:', language);

  useEffect(() => {
    // Adicionar handler global de erros não capturados
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[DEBUG] Unhandled promise rejection:', event.reason);
      console.error('[DEBUG] Rejection stack:', (event.reason as Error)?.stack || 'No stack');
      console.error('[DEBUG] Full rejection:', event.reason);
    };
    
    const handleError = (event: ErrorEvent) => {
      console.error('[DEBUG] Global error caught:', event.error);
      console.error('[DEBUG] Error message:', event.message);
      console.error('[DEBUG] Error filename:', event.filename);
      console.error('[DEBUG] Error lineno:', event.lineno);
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection as EventListener);
    window.addEventListener('error', handleError);
    
    (async function () {
      console.log('[DEBUG] Measurement component mounted');
      console.log('[DEBUG] Starting initialization process...');
      const container = document.createElement('div');
      container.id = 'measurement-embedded-app-container';
      console.log('[DEBUG] Container created with id:', container.id);

      const apiUrl = '/api';
      
      try {
        console.log('[DEBUG] Fetching studyId from:', `${apiUrl}/studyId`);
        const studyIdResponse = await fetch(`${apiUrl}/studyId`);
        console.log('[DEBUG] studyId response status:', studyIdResponse.status);
        console.log('[DEBUG] studyId response ok:', studyIdResponse.ok);
        
        const studyIdText = await studyIdResponse.text();
        console.log('[DEBUG] studyId response text:', studyIdText);
        
        let studyIdData;
        try {
          studyIdData = JSON.parse(studyIdText);
          console.log('[DEBUG] studyId parsed JSON:', studyIdData);
        } catch (parseError) {
          console.error('[DEBUG] Failed to parse studyId response as JSON:', parseError);
          console.error('[DEBUG] Response was:', studyIdText);
          throw new Error(`Failed to parse studyId response. Status: ${studyIdResponse.status}, Response: ${studyIdText.substring(0, 200)}`);
        }

        console.log('[DEBUG] Fetching token from:', `${apiUrl}/token`);
        const tokenResponse = await fetch(`${apiUrl}/token`);
        console.log('[DEBUG] token response status:', tokenResponse.status);
        console.log('[DEBUG] token response ok:', tokenResponse.ok);
        
        const tokenText = await tokenResponse.text();
        console.log('[DEBUG] token response text:', tokenText.substring(0, 500));
        
        let tokenData;
        try {
          tokenData = JSON.parse(tokenText);
          console.log('[DEBUG] token parsed JSON keys:', Object.keys(tokenData));
        } catch (parseError) {
          console.error('[DEBUG] Failed to parse token response as JSON:', parseError);
          console.error('[DEBUG] Response was:', tokenText.substring(0, 200));
          throw new Error(`Failed to parse token response. Status: ${tokenResponse.status}, Response: ${tokenText.substring(0, 200)}`);
        }

        console.log('[DEBUG] studyIdData.status:', studyIdData.status);
        console.log('[DEBUG] tokenData.status:', tokenData.status);

        // Validar se há erros nas respostas
        if (studyIdData.status !== '200') {
          const errorMsg = studyIdData.error || 'Erro desconhecido ao obter Study ID';
          console.error('[DEBUG] Study ID API error:', errorMsg);
          throw new Error(`Erro ao obter Study ID: ${errorMsg}`);
        }

        if (tokenData.status !== '200') {
          const errorMsg = tokenData.error || 'Erro desconhecido ao obter Token';
          console.error('[DEBUG] Token API error:', errorMsg);
          throw new Error(`Erro ao obter Token: ${errorMsg}`);
        }

        // Validar se os dados necessários estão presentes
        if (!studyIdData.studyId) {
          console.error('[DEBUG] Study ID is missing from response');
          throw new Error('Study ID não encontrado na resposta da API');
        }

        if (!tokenData.token) {
          console.error('[DEBUG] Token is missing from response');
          throw new Error('Token não encontrado na resposta da API');
        }

        if (!tokenData.refreshToken) {
          console.warn('[DEBUG] RefreshToken is missing from response, but continuing...');
        }

      if (studyIdData.status === '200' && tokenData.status === '200') {
        console.log('[DEBUG] Both API calls successful, initializing MeasurementEmbeddedApp');
        
        // Anexar o container ao DOM antes de inicializar
        // Verificar se já existe um container e removê-lo primeiro
        const existingContainer = document.getElementById('measurement-embedded-app-container');
        if (existingContainer && existingContainer.parentNode) {
          existingContainer.parentNode.removeChild(existingContainer);
        }
        
        // Aguardar o próximo tick para garantir que o React renderizou o elemento
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Anexar ao elemento data-measurement-container dentro do componente
        let containerParent = document.querySelector('[data-measurement-container]');
        if (!containerParent) {
          // Se não encontrou, tentar novamente após um pequeno delay
          await new Promise(resolve => setTimeout(resolve, 100));
          containerParent = document.querySelector('[data-measurement-container]');
        }
        
        if (containerParent) {
          containerParent.appendChild(container);
          console.log('[DEBUG] Container appended to DOM, parent:', containerParent);
        } else {
          console.warn('[DEBUG] data-measurement-container not found, appending to body');
          document.body.appendChild(container);
        }
        
        // Validar profile antes de inicializar
        if (!demographics) {
          console.error('[DEBUG] Demographics profile is missing');
          throw new Error('Perfil demográfico não encontrado. Por favor, preencha o formulário de perfil primeiro.');
        }

        // Validar campos obrigatórios do profile
        const requiredFields: Array<keyof typeof demographics> = ['age', 'height', 'weight', 'sex'];
        const missingFields = requiredFields.filter(field => {
          const value = demographics[field];
          return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
        });
        if (missingFields.length > 0) {
          console.error('[DEBUG] Missing required profile fields:', missingFields);
          throw new Error(`Campos obrigatórios do perfil estão faltando: ${missingFields.join(', ')}. Por favor, preencha o formulário de perfil completamente.`);
        }

        console.log('[DEBUG] Profile validation passed:', {
          age: demographics.age,
          height: demographics.height,
          weight: demographics.weight,
          sex: demographics.sex,
          smoking: demographics.smoking,
          bloodPressureMedication: demographics.bloodPressureMedication,
          diabetes: demographics.diabetes,
        });

        const options: MeasurementEmbeddedAppOptions = {
          container,
          ...(language && { language }),
          appPath: './wmea',
          // apiUrl: 'api.na-east.deepaffex.ai',
          settings: {
            token: tokenData.token,
            refreshToken: tokenData.refreshToken,
            studyId: studyIdData.studyId,
          },
          profile: demographics,
          config: {
            checkConstraints: true,
            cameraFacingMode: 'user',
            cameraAutoStart: false,
            measurementAutoStart: false,
            cancelWhenLowSNR: true,
          },
          loadError: function (error) {
            console.error('[DEBUG] load error', error);
            console.error('[DEBUG] load error details:', JSON.stringify(error, null, 2));
          },
        };
        
        console.log('[DEBUG] About to configure event handlers and call init()');
        
        // Configurar TODOS os handlers de eventos ANTES de chamar init()
        measurementApp.on.results = (results) => {
          console.log('[DEBUG] Results received');
          setResults(results);
          navigate('/results');
        };
        
        measurementApp.on.error = async (error) => {
          console.error('[DEBUG] Error event received from SDK:', {
            code: error.code,
            message: error.message,
            error: error,
          });
          
          // Log detalhado do erro para debug
          const errorCodeStr = String(error.code);
          const errorMessageStr = String(error.message || '');
          if (errorCodeStr.includes('UNEXPECTED') || errorMessageStr.includes('UNEXPECTED_ERROR')) {
            console.error('[DEBUG] UNEXPECTED_ERROR detected. Possible causes:');
            console.error('[DEBUG] - Invalid token or studyId');
            console.error('[DEBUG] - Network connectivity issues');
            console.error('[DEBUG] - API endpoint unreachable');
            console.error('[DEBUG] - Invalid profile data');
            console.error('[DEBUG] Full error object:', JSON.stringify(error, null, 2));
          }
          
          if (isCancelOnErrorCode(error.code)) {
            try {
              await measurementApp.cancel(true);
            } catch (e) {
              console.warn('Failed to cancel after error code', error.code, e);
            }
          }
          if (isUiErrorCode(error.code)) {
            setAppError(error);
          } else {
            // Para erros não-UI, ainda mostrar uma mensagem genérica
            console.error('[DEBUG] Non-UI error occurred:', error.code, error.message);
          }
        };
        
        measurementApp.on.event = (appEvent) => {
          console.log('[DEBUG] App event received:', appEvent);
          switch (appEvent) {
            case appEvents.APP_LOADED:
              console.log('[DEBUG] APP_LOADED event received, marking as initialized');
              setIsInitialized(true);
              break;
            case appEvents.CAMERA_PERMISSION_GRANTED:
              console.log('[DEBUG] Camera permission granted');
              break;
            case appEvents.CAMERA_STARTED:
              console.log('[DEBUG] Camera started');
              break;
            case appEvents.MEASUREMENT_STARTED:
              console.log('[DEBUG] Measurement started');
              break;
            case appEvents.MEASUREMENT_COMPLETED:
              console.log('[DEBUG] Measurement completed');
              break;
            default:
              break;
          }
        };
        
        console.log('[DEBUG] Event handlers configured, now calling measurementApp.init()...');
        console.log('[DEBUG] Options being passed to init:', {
          container: container.id,
          hasLanguage: !!language,
          appPath: './wmea',
          hasToken: !!tokenData.token,
          hasRefreshToken: !!tokenData.refreshToken,
          studyId: studyIdData.studyId,
          hasProfile: !!demographics,
        });
        
        // Verificar se as APIs necessárias estão disponíveis
        if (typeof navigator === 'undefined') {
          throw new Error('navigator is not available');
        }
        
        if (typeof navigator.mediaDevices === 'undefined') {
          console.warn('[DEBUG] navigator.mediaDevices is not available. This may cause issues with camera access.');
        }
        
        try {
          console.log('[DEBUG] About to call measurementApp.init()...');
          const initResult = measurementApp.init(options);
          console.log('[DEBUG] measurementApp.init() returned:', initResult);
          console.log('[DEBUG] measurementApp.init() completed successfully, waiting for APP_LOADED event');
        } catch (initError) {
          console.error('[DEBUG] Error calling measurementApp.init():', initError);
          console.error('[DEBUG] Init error stack:', initError instanceof Error ? initError.stack : 'No stack');
          console.error('[DEBUG] Init error name:', initError instanceof Error ? initError.name : 'Unknown');
          console.error('[DEBUG] Init error message:', initError instanceof Error ? initError.message : String(initError));
          
          // Se o erro for relacionado a ondevicechange, pode ser um problema do SDK
          if (initError instanceof Error && initError.message.includes('ondevicechange')) {
            console.error('[DEBUG] This error is likely related to the SDK trying to access device APIs that are not available.');
            console.error('[DEBUG] Possible causes:');
            console.error('[DEBUG] 1. Browser does not support required APIs');
            console.error('[DEBUG] 2. Page is not served over HTTPS (required for camera access)');
            console.error('[DEBUG] 3. Browser permissions are blocking device access');
          }
          
          throw initError;
        }
        
        // Aguardar um pouco para ver se algum erro assíncrono aparece
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[DEBUG] Waited 100ms after init(), no immediate errors detected');
        
        // Event handlers já foram configurados acima antes do init()
      } else {
        console.error('[DEBUG] Failed to get Study ID and Token pair');
        console.error('[DEBUG] studyIdData:', studyIdData);
        console.error('[DEBUG] tokenData:', tokenData);
      }
      } catch (error) {
        console.error('[DEBUG] Error in Measurement useEffect:', error);
        console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('[DEBUG] Error message:', error instanceof Error ? error.message : 'Unknown error during initialization');
        
        // Para erros de inicialização, apenas logar no console
        // Não podemos criar um MeasurementEmbeddedAppError válido sem um ErrorCode válido
        // O erro será logado no console para debug
        console.error('[DEBUG] Initialization error cannot be displayed as MeasurementEmbeddedAppError');
        
        // Opcionalmente, você pode redirecionar para o perfil ou mostrar uma mensagem genérica
        // Por enquanto, apenas logamos o erro
      }
    })();
    
    return () => {
      // Remover listeners globais
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      const cleanup = async () => {
        try {
          const logs = await measurementApp.getLogs();
          console.log('WMEA Logs:', logs);
          // Destroy the instance and free up resources
          measurementApp.destroy();
          // Remover o container do DOM
          const container = document.getElementById('measurement-embedded-app-container');
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        } catch (error) {
          console.warn('[DEBUG] Error during cleanup:', error);
        }
      };
      cleanup();
    };
  }, []);

  // Listen for theme changes and update the measurement app
  useEffect(() => {
    console.log('[DEBUG] Theme effect triggered, isInitialized:', isInitialized, 'theme:', theme);
    if (isInitialized) {
      console.log('[DEBUG] Setting theme to:', theme);
      try {
        measurementApp.setTheme(theme);
        console.log('[DEBUG] Theme set successfully');
      } catch (error) {
        console.error('[DEBUG] Error setting theme:', error);
        console.error('[DEBUG] Theme error stack:', error instanceof Error ? error.stack : 'No stack');
      }
    } else {
      console.log('[DEBUG] Skipping setTheme - app not initialized yet');
    }
  }, [theme, isInitialized]);

  // Listen for language changes and update the measurement app
  useEffect(() => {
    console.log('[DEBUG] Language effect triggered, isInitialized:', isInitialized, 'language:', language);
    if (isInitialized && language) {
      console.log('[DEBUG] Setting language to:', language);
      try {
        measurementApp.setLanguage(language);
        console.log('[DEBUG] Language set successfully');
      } catch (error) {
        console.error('[DEBUG] Error setting language:', error);
        console.error('[DEBUG] Language error stack:', error instanceof Error ? error.stack : 'No stack');
      }
    } else {
      console.log('[DEBUG] Skipping setLanguage - app not initialized yet or language not set');
    }
  }, [language, isInitialized]);

  const onClear = () => {
    setAppError(null);
  };

  return (
    <div {...stylex.props(styles.container)}>
      {appError ? <ErrorMessage error={appError} onClear={onClear} /> : null}
      {/* Container será anexado aqui pelo código de inicialização */}
      <div data-measurement-container style={{ flex: 1, position: 'relative', padding: '16px' }} />
    </div>
  );
};

export default Measurement;
