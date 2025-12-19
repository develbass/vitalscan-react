import { useEffect, useState } from 'react';
import state from '../../../state';

export interface ValidateTokenResponse {
  allowBeneficiaryScan: boolean;
  beneficiaryUuid?: string;
  beneficiaryScanUuid?: string;
  clientUuid?: string;
}

export interface UseValidateTokenResult {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  data: ValidateTokenResponse | null;
}

/**
 * Hook reutilizável para validar token Rapidoc
 * Busca token e clientUuid da query string da URL
 */
export const useValidateToken = (): UseValidateTokenResult => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:21',message:'Hook called - initializing state',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValidateTokenResponse | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:28',message:'useEffect executing',data:{url:window.location.href,search:window.location.search},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Buscar parâmetros da URL usando URLSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const clientUuid = searchParams.get('clientUuid');
    const beneficiaryUuid = searchParams.get('beneficiaryUuid');

    // Se não tiver os parâmetros necessários, tenta recuperar do localStorage
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:35',message:'URL params check',data:{hasToken:!!token,hasClientUuid:!!clientUuid,hasBeneficiaryUuid:!!beneficiaryUuid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!token || !clientUuid || !beneficiaryUuid) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:44',message:'Missing params - checking localStorage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // Tenta recuperar dados do localStorage se já foram validados anteriormente
      const savedBeneficiaryUuid = localStorage.getItem('beneficiaryUuid');
      const savedClientUuid = localStorage.getItem('clientUuid');
      const savedBeneficiaryScanUuid = localStorage.getItem('beneficiaryScanUuid');
      const savedToken = localStorage.getItem('token');
      
      if (savedToken && savedBeneficiaryUuid && savedClientUuid) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:52',message:'Restoring data from localStorage',data:{hasBeneficiaryUuid:!!savedBeneficiaryUuid,hasClientUuid:!!savedClientUuid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Reconstrói o objeto data a partir do localStorage
        const restoredData: ValidateTokenResponse = {
          allowBeneficiaryScan: true,
          beneficiaryUuid: savedBeneficiaryUuid,
          clientUuid: savedClientUuid,
          beneficiaryScanUuid: savedBeneficiaryScanUuid || undefined,
        };
        setData(restoredData);
        setIsValid(true);
        
        // Marcar usuário como logado se já havia dados salvos
        state.auth.login();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:67',message:'User logged in from localStorage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
      return;
    }

    const validateToken = async () => {
      setIsValidating(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          token,
          beneficiaryUuid,
          clientUuid,
        });

        const response = await fetch(`/api/validate-token?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }

        const result: ValidateTokenResponse = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:58',message:'Setting data from API response',data:{allowBeneficiaryScan:result.allowBeneficiaryScan,hasBeneficiaryUuid:!!result.beneficiaryUuid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setData(result);
        setIsValid(result.allowBeneficiaryScan);
        
        // Salvar no localStorage quando a validação for bem-sucedida
        if (result.allowBeneficiaryScan) {
          // Salvar o token
          localStorage.setItem('token', token);
          
          if (result.beneficiaryUuid) {
            localStorage.setItem('beneficiaryUuid', result.beneficiaryUuid);
          }
          if (result.clientUuid) {
            localStorage.setItem('clientUuid', result.clientUuid);
          }
          if (result.beneficiaryScanUuid) {
            localStorage.setItem('beneficiaryScanUuid', result.beneficiaryScanUuid);
          }
          
          // Marcar usuário como logado para permitir acesso às rotas protegidas
          state.auth.login();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useValidateToken.ts:110',message:'User logged in after token validation',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar token';
        setError(errorMessage);
        setIsValid(false);
        console.error('Erro ao validar token:', err);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executa apenas uma vez ao montar o componente

  return {
    isValidating,
    isValid,
    error,
    data,
  };
};

