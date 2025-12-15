import { useNavigate } from 'react-router';
import state from '../../../state';
import { FormState } from '../types';
import { isFormValid } from './validationUtils';
import { convertFormStateToSDKDemographics, getHeightInCm, getWeightInKg } from './utils';
import { FORM_FIELDS, FORM_VALUES } from '../constants';

const mapFormSmokingToRapidoc = (smoking: FormState[typeof FORM_FIELDS.SMOKING]): boolean | string => {
  if (smoking === FORM_VALUES.SMOKER_TRUE) return true;
  if (smoking === FORM_VALUES.SMOKER_FALSE) return false;
  return '';
};

const mapFormBloodPressureMedToRapidoc = (
  bloodPressureMed: FormState[typeof FORM_FIELDS.BLOOD_PRESSURE_MED]
): boolean | string => {
  if (bloodPressureMed === FORM_VALUES.BLOOD_PRESSURE_MEDICATION_TRUE) return true;
  if (bloodPressureMed === FORM_VALUES.BLOOD_PRESSURE_MEDICATION_FALSE) return false;
  return '';
};

const mapFormDiabetesToRapidoc = (
  diabetes: FormState[typeof FORM_FIELDS.DIABETES_STATUS]
): string => {
  if (diabetes === FORM_VALUES.DIABETES_TYPE1) return 'TYPE1';
  if (diabetes === FORM_VALUES.DIABETES_TYPE2) return 'TYPE2';
  if (diabetes === FORM_VALUES.DIABETES_NONE) return 'NON';
  return '';
};

const mapFormSexToRapidocGender = (sex: FormState[typeof FORM_FIELDS.SEX]): string => {
  if (sex === FORM_VALUES.MALE) return 'M';
  if (sex === FORM_VALUES.FEMALE) return 'F';
  return '';
};

const saveRapidocHealthInformations = async (formState: FormState) => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const beneficiaryUuid = searchParams.get('beneficiaryUuid');
    const clientUuid = searchParams.get('clientUuid');

    if (!beneficiaryUuid) {
      return;
    }

    const height = getHeightInCm(formState);
    const weight = getWeightInKg(formState);
    const smoke = mapFormSmokingToRapidoc(formState[FORM_FIELDS.SMOKING]);
    const medicationHypertension = mapFormBloodPressureMedToRapidoc(
      formState[FORM_FIELDS.BLOOD_PRESSURE_MED]
    );
    const gender = mapFormSexToRapidocGender(formState[FORM_FIELDS.SEX]);
    const diabetes = mapFormDiabetesToRapidoc(formState[FORM_FIELDS.DIABETES_STATUS]);

    const payload = {
      beneficiaryUuid,
      clientUuid: clientUuid || undefined,
      height,
      weight,
      smoke,
      medicationHypertension,
      gender,
      diabetes,
    };

    await fetch('/api/health-informations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Erro ao salvar informações de saúde na Rapidoc:', error);
  }
};

export const useFormSubmission = () => {
  const navigate = useNavigate();

  const handleSubmit = async (formState: FormState): Promise<void> => {
    // Defensive validation check but disabled btns should prevent this
    if (!isFormValid(formState)) {
      // TODO: Show error notification to user if needed
      return;
    }

    // Salva informações de saúde na Rapidoc quando existir beneficiaryUuid na URL
    await saveRapidocHealthInformations(formState);

    // Convert form data to SDK format before pushing to store
    const demographicsData = convertFormStateToSDKDemographics(formState);

    // Update the demographics store
    state.demographics.setDemographics(demographicsData);

    // Navigate to measurement page
    navigate('/measurement');
  };

  return {
    handleSubmit,
  };
};
