import { useEffect } from 'react';
import { FORM_FIELDS, FORM_VALUES } from '../constants';
import type { FormState } from '../types';

interface BeneficiaryHealthResponse {
  beneficiary?: {
    uuid: string;
    name?: string;
    email?: string;
    cpf?: string;
    birth?: string;
    phone?: string | null;
  };
  uuid?: string;
  height?: number;
  weight?: number | string;
  smoke?: boolean | string;
  medicationHypertension?: boolean | string;
  gender?: string;
  diabetes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapSmokeToFormValue = (smoke: boolean | string | undefined): FormState[typeof FORM_FIELDS.SMOKING] => {
  if (smoke === true || String(smoke).toLowerCase() === 'true') {
    return FORM_VALUES.SMOKER_TRUE;
  }
  if (smoke === false || String(smoke).toLowerCase() === 'false') {
    return FORM_VALUES.SMOKER_FALSE;
  }
  return '';
};

const mapBloodPressureMedToFormValue = (
  medicationHypertension: boolean | string | undefined
): FormState[typeof FORM_FIELDS.BLOOD_PRESSURE_MED] => {
  if (medicationHypertension === true || String(medicationHypertension).toLowerCase() === 'true') {
    return FORM_VALUES.BLOOD_PRESSURE_MEDICATION_TRUE;
  }
  if (medicationHypertension === false || String(medicationHypertension).toLowerCase() === 'false') {
    return FORM_VALUES.BLOOD_PRESSURE_MEDICATION_FALSE;
  }
  return '';
};

const mapDiabetesToFormValue = (diabetes: string | undefined): FormState[typeof FORM_FIELDS.DIABETES_STATUS] => {
  if (!diabetes) return '';

  const normalized = diabetes.toUpperCase();

  if (normalized === 'TYPE1' || normalized === 'TYPE_1' || normalized === 'TYPE-1') {
    return FORM_VALUES.DIABETES_TYPE1;
  }

  if (normalized === 'TYPE2' || normalized === 'TYPE_2' || normalized === 'TYPE-2') {
    return FORM_VALUES.DIABETES_TYPE2;
  }

  if (normalized === 'NON' || normalized === 'NONE' || normalized === 'NO' || normalized === 'NENHUM') {
    return FORM_VALUES.DIABETES_NONE;
  }

  return '';
};

const mapGenderToFormValue = (gender: string | undefined): FormState[typeof FORM_FIELDS.SEX] => {
  if (!gender) return '';

  const normalized = gender.toLowerCase();

  if (normalized === 'male' || normalized === 'm' || normalized === 'masculino' || normalized === 'masculine') {
    return FORM_VALUES.MALE;
  }

  if (normalized === 'female' || normalized === 'f' || normalized === 'feminino' || normalized === 'feminine') {
    return FORM_VALUES.FEMALE;
  }

  return '';
};

/**
 * Calcula a idade a partir da data de nascimento
 */
const calculateAge = (birthDate: string | undefined): string => {
  if (!birthDate) return '';

  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age > 0 ? String(age) : '';
  } catch (error) {
    console.error('Erro ao calcular idade:', error);
    return '';
  }
};

// Cache global para evitar requisições duplicadas entre diferentes instâncias do hook
// Armazena tanto a promise quanto os dados para que possam ser reutilizados
interface CacheEntry {
  promise: Promise<BeneficiaryHealthResponse>;
  data?: BeneficiaryHealthResponse;
}

const fetchCache = new Map<string, CacheEntry>();

/**
 * Preenche automaticamente o formulário de perfil usando os dados da API Rapidoc,
 * quando houver beneficiaryUuid (e opcionalmente clientUuid) na URL.
 * Evita requisições duplicadas usando cache global baseado no beneficiaryUuid.
 */
export const useRapidocHealthPrefill = (
  setFormState: React.Dispatch<React.SetStateAction<FormState>>
) => {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const beneficiaryUuid = searchParams.get('beneficiaryUuid');
    const clientUuid = searchParams.get('clientUuid');

    if (!beneficiaryUuid) {
      return;
    }

    // Criar chave única baseada no beneficiaryUuid para cache
    const cacheKey = `beneficiary-health-${beneficiaryUuid}`;

    // Função para aplicar os dados ao formulário
    const applyDataToForm = (data: BeneficiaryHealthResponse) => {
      setFormState((prev) => {
        const next: FormState = { ...prev };

        console.log('[useRapidocHealthPrefill] Aplicando dados ao formulário. Estado anterior:', prev);
        console.log('[useRapidocHealthPrefill] Dados recebidos:', data);

        // Preencher apenas campos vazios para não sobrescrever dados já preenchidos
        if (typeof data.height === 'number' && !next[FORM_FIELDS.HEIGHT_METRIC]) {
          next[FORM_FIELDS.UNIT] = FORM_VALUES.METRIC;
          next[FORM_FIELDS.HEIGHT_METRIC] = String(data.height);
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo altura:', data.height);
        }

        if ((typeof data.weight === 'number' || typeof data.weight === 'string') && !next[FORM_FIELDS.WEIGHT]) {
          next[FORM_FIELDS.WEIGHT] = String(data.weight);
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo peso:', data.weight);
        }

        // Preencher sex (gender)
        if (data.gender && !next[FORM_FIELDS.SEX]) {
          next[FORM_FIELDS.SEX] = mapGenderToFormValue(data.gender);
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo sexo:', data.gender, '->', next[FORM_FIELDS.SEX]);
        }

        // Preencher age a partir da data de nascimento
        const age = calculateAge(data.beneficiary?.birth);
        if (age && !next[FORM_FIELDS.AGE]) {
          next[FORM_FIELDS.AGE] = age;
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo idade:', age, 'de', data.beneficiary?.birth);
        }

        // Preencher campos médicos apenas se estiverem vazios
        if (!next[FORM_FIELDS.SMOKING]) {
          next[FORM_FIELDS.SMOKING] = mapSmokeToFormValue(data.smoke);
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo fumo:', data.smoke, '->', next[FORM_FIELDS.SMOKING]);
        }

        if (!next[FORM_FIELDS.BLOOD_PRESSURE_MED]) {
          next[FORM_FIELDS.BLOOD_PRESSURE_MED] = mapBloodPressureMedToFormValue(
            data.medicationHypertension
          );
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo medicação pressão:', data.medicationHypertension);
        }

        if (!next[FORM_FIELDS.DIABETES_STATUS]) {
          next[FORM_FIELDS.DIABETES_STATUS] = mapDiabetesToFormValue(data.diabetes);
          console.log('[useRapidocHealthPrefill] ✓ Preenchendo diabetes:', data.diabetes);
        }

        console.log('[useRapidocHealthPrefill] Novo estado do formulário:', next);
        return next;
      });
    };

    // Função para criar a requisição
    const createFetchPromise = (): Promise<BeneficiaryHealthResponse> => {
      return (async () => {
        try {
          const params = new URLSearchParams({ beneficiaryUuid });
          if (clientUuid) {
            params.set('clientUuid', clientUuid);
          }

          const response = await fetch(`/api/beneficiary-health?${params.toString()}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              'Erro ao buscar informações de saúde do beneficiário:',
              errorData.error || `${response.status} ${response.statusText}`
            );
            throw new Error(errorData.error || `${response.status} ${response.statusText}`);
          }

          const data: BeneficiaryHealthResponse = await response.json();
          console.log('[useRapidocHealthPrefill] Dados recebidos da API:', data);

          // Aplicar dados ao formulário
          applyDataToForm(data);

          return data;
        } catch (error) {
          console.error('Erro inesperado ao preencher formulário com dados Rapidoc:', error);
          // Remover do cache imediatamente em caso de erro
          fetchCache.delete(cacheKey);
          throw error;
        }
      })();
    };

    // Verificar se já existe uma requisição em andamento ou dados em cache
    // IMPORTANTE: Esta verificação e a adição ao cache devem ser feitas de forma síncrona
    // para evitar race conditions. Como JavaScript é single-threaded, isso é seguro.
    const cacheEntry = fetchCache.get(cacheKey);
    
    if (!cacheEntry) {
      // Não existe requisição em andamento, criar uma nova
      console.log('[useRapidocHealthPrefill] Criando nova requisição para:', cacheKey);
      
      // Criar a promise primeiro
      const fetchPromise = createFetchPromise();
      
      // Adicionar ao cache IMEDIATAMENTE após criar (de forma síncrona)
      // Isso garante que se outro hook tentar fazer a mesma requisição no próximo tick,
      // ele verá o cache e não criará uma nova requisição
      fetchCache.set(cacheKey, { promise: fetchPromise });

      // Aguardar a conclusão e salvar os dados no cache
      void fetchPromise
        .then((data) => {
          const entry = fetchCache.get(cacheKey);
          if (entry) {
            entry.data = data;
          }
          // Remover do cache após um tempo para liberar memória
          setTimeout(() => {
            fetchCache.delete(cacheKey);
          }, 5000);
        })
        .catch((error) => {
          console.error('[useRapidocHealthPrefill] Erro na requisição:', error);
          fetchCache.delete(cacheKey);
        });
    } else if (cacheEntry.data) {
      // Dados já estão disponíveis no cache, aplicar imediatamente
      console.log('[useRapidocHealthPrefill] Dados já disponíveis no cache, aplicando:', cacheEntry.data);
      try {
        applyDataToForm(cacheEntry.data);
      } catch (error) {
        console.error('[useRapidocHealthPrefill] Erro ao aplicar dados do cache:', error);
      }
    } else {
      // Já existe uma requisição em andamento, aguardar e aplicar quando completar
      console.log('[useRapidocHealthPrefill] Reutilizando requisição existente para:', cacheKey);
      try {
        // Usar void para evitar avisos sobre promises não tratadas
        void cacheEntry.promise
          .then((data) => {
            console.log('[useRapidocHealthPrefill] Requisição reutilizada completou, aplicando dados:', data);
            try {
              applyDataToForm(data);
            } catch (error) {
              console.error('[useRapidocHealthPrefill] Erro ao aplicar dados da requisição reutilizada:', error);
            }
          })
          .catch((error) => {
            console.error('[useRapidocHealthPrefill] Erro na requisição reutilizada:', error);
          });
      } catch (error) {
        console.error('[useRapidocHealthPrefill] Erro ao acessar promise do cache:', error);
        // Se houver erro ao acessar a promise, remover do cache e criar uma nova
        fetchCache.delete(cacheKey);
        const fetchPromise = createFetchPromise();
        fetchCache.set(cacheKey, { promise: fetchPromise });
        void fetchPromise
          .then((data) => {
            const entry = fetchCache.get(cacheKey);
            if (entry) {
              entry.data = data;
            }
            setTimeout(() => {
              fetchCache.delete(cacheKey);
            }, 5000);
          })
          .catch(() => {
            fetchCache.delete(cacheKey);
          });
      }
    }
  }, [setFormState]);
};


