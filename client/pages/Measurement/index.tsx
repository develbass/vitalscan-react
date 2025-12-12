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
  const [measurementApp] = useState(() => new MeasurementEmbeddedApp());
  const { setResults } = useSnapshot(state.measurement);
  const { theme, language } = useSnapshot(state.general);
  const { demographics } = useSnapshot(state.demographics);
  const navigate = useNavigate();
  const [appError, setAppError] = useState<MeasurementEmbeddedAppError | null>(null);

  useEffect(() => {
    (async function () {
      console.log('[DEBUG] Measurement component mounted');
      const container = document.createElement('div');
      container.id = 'measurement-embedded-app-container';

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

      if (studyIdData.status === '200' && tokenData.status === '200') {
        console.log('[DEBUG] Both API calls successful, initializing MeasurementEmbeddedApp');
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
            console.error('load error', error);
          },
        };
        measurementApp.init(options);

        measurementApp.on.results = (results) => {
          setResults(results);
          navigate('/results');
        };
        measurementApp.on.error = async (error) => {
          if (isCancelOnErrorCode(error.code)) {
            try {
              await measurementApp.cancel(true);
            } catch (e) {
              console.warn('Failed to cancel after error code', error.code, e);
            }
          }
          if (isUiErrorCode(error.code)) {
            setAppError(error);
          }
          console.log('Error received: ', error.code, error.message);
        };
        measurementApp.on.event = (appEvent) => {
          switch (appEvent) {
            case appEvents.APP_LOADED:
              break;
            case appEvents.CAMERA_PERMISSION_GRANTED:
              break;
            case appEvents.CAMERA_STARTED:
              break;
            case appEvents.CONSTRAINT_VIOLATION:
              break;
            case appEvents.INTERMEDIATE_RESULTS:
              break;
            case appEvents.MEASUREMENT_CANCELED:
              break;
            case appEvents.MEASUREMENT_COMPLETED:
              break;
            case appEvents.MEASUREMENT_STARTED:
              break;
            case appEvents.PAGE_UNLOADED:
              break;
            case appEvents.PAGE_VISIBILITY_CHANGE:
              break;
            case appEvents.RESULTS_RECEIVED:
              break;
            default:
              break;
          }
          console.log('App event received', appEvent);
        };
      } else {
        console.error('[DEBUG] Failed to get Study ID and Token pair');
        console.error('[DEBUG] studyIdData:', studyIdData);
        console.error('[DEBUG] tokenData:', tokenData);
      }
      } catch (error) {
        console.error('[DEBUG] Error in Measurement useEffect:', error);
        console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('[DEBUG] Error message:', error instanceof Error ? error.message : 'Unknown error during initialization');
        // Não definimos appError aqui porque o erro de inicialização não é um MeasurementEmbeddedAppError válido
        // O erro será logado no console para debug
      }
    })();
    return () => {
      const cleanup = async () => {
        const logs = await measurementApp.getLogs();
        console.log('WMEA Logs:', logs);
        // Destroy the instance and free up resources
        measurementApp.destroy();
      };
      cleanup();
    };
  }, []);

  // Listen for theme changes and update the measurement app
  useEffect(() => {
    measurementApp.setTheme(theme);
  }, [theme]);

  // Listen for language changes and update the measurement app
  useEffect(() => {
    if (language) {
      measurementApp.setLanguage(language);
    }
  }, [language]);

  const onClear = () => {
    setAppError(null);
  };

  return (
    <div {...stylex.props(styles.container)}>
      <MeasurementHeader />
      {appError ? <ErrorMessage error={appError} onClear={onClear} /> : null}
    </div>
  );
};

export default Measurement;
