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

/**
 * Preenche automaticamente o formulário de perfil usando os dados da API Rapidoc,
 * quando houver beneficiaryUuid (e opcionalmente clientUuid) na URL.
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

    const fetchHealthInfo = async () => {
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
          return;
        }

        const data: BeneficiaryHealthResponse = await response.json();

        setFormState((prev) => {
          const next: FormState = { ...prev };

          if (typeof data.height === 'number') {
            next[FORM_FIELDS.UNIT] = FORM_VALUES.METRIC;
            next[FORM_FIELDS.HEIGHT_METRIC] = String(data.height);
          }

          if (typeof data.weight === 'number' || typeof data.weight === 'string') {
            next[FORM_FIELDS.WEIGHT] = String(data.weight);
          }

          next[FORM_FIELDS.SMOKING] = mapSmokeToFormValue(data.smoke);
          next[FORM_FIELDS.BLOOD_PRESSURE_MED] = mapBloodPressureMedToFormValue(
            data.medicationHypertension
          );
          next[FORM_FIELDS.DIABETES_STATUS] = mapDiabetesToFormValue(data.diabetes);

          return next;
        });
      } catch (error) {
        console.error('Erro inesperado ao preencher formulário com dados Rapidoc:', error);
      }
    };

    void fetchHealthInfo();
  }, [setFormState]);
};


