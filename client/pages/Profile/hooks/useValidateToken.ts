import { useEffect, useState } from 'react';

export interface ValidateTokenResponse {
  allowBeneficiaryScan: boolean;
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
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValidateTokenResponse | null>(null);

  useEffect(() => {
    // Buscar parâmetros da URL usando URLSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const clientUuid = searchParams.get('clientUuid');
    const beneficiaryUuid = searchParams.get('beneficiaryUuid');

    // Se não tiver os parâmetros necessários, não faz nada
    if (!token || !clientUuid || !beneficiaryUuid) {
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
        setData(result);
        setIsValid(result.allowBeneficiaryScan);
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

