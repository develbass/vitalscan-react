import { useState } from 'react';
import { Button } from '@nuralogix.ai/web-ui';
import * as stylex from '@stylexjs/stylex';
import {
  AgeField,
  MetricHeightField,
  ImperialHeightField,
  WeightField,
  SexSelector,
  SmokingField,
  BloodPressureMedField,
  DiabetesStatusField,
} from './Fields';
import { FormState } from './types';
import { INITIAL_FORM_STATE, FORM_VALUES, FORM_FIELDS } from './constants';
import { useFormSubmission } from './utils/formSubmissionUtils';
import useUnitConversion from './hooks/useUnitConversion';
import { usePrepopulateForm } from './hooks/usePrepopulateForm';
import { useRapidocHealthPrefill } from './hooks/useRapidocHealthPrefill';
import { isFormValid } from './utils/validationUtils';
import { createFieldHandler } from './utils/formUtils';

const styles = stylex.create({
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    boxSizing: 'border-box',
    minHeight: 'calc(100vh - 64px)',
    overflowY: 'auto',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  container: {
    padding: '0px',
    maxWidth: '520px',
    width: '100%',
    '@media (min-width: 640px)': {
      padding: '0px',
    },
    '@media (min-width: 900px)': {
      // Produção está visivelmente menor/mais compacta que o layout local.
      // Aplicamos um scale no desktop para igualar fonte/inputs/spacing 1:1 sem brigar com estilos internos do @nuralogix.ai/web-ui.
      transform: 'scale(0.82)',
      transformOrigin: 'top center',
    },
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '44px',
    lineHeight: '1.1',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0B1B3E',
    '@media (max-width: 640px)': {
      fontSize: '40px',
    },
  },
  formContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rowFields: {
    display: 'flex',
    gap: '12px',
    '@media (max-width: 640px)': {
      flexDirection: 'column',
    },
  },
  fieldHalf: {
    flex: 1,
  },
  buttonWrapper: {
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

const FormWizard = () => {
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const { handleSubmit } = useFormSubmission();

  useUnitConversion(formState, setFormState);
  usePrepopulateForm(setFormState);
  useRapidocHealthPrefill(setFormState);

  const onSubmit = () => {
    void handleSubmit(formState);
  };

  const isMetric = formState.unit === FORM_VALUES.METRIC;
  const { sex, age, heightMetric, heightFeet, heightInches, weight, smoking, bloodPressureMed, diabetesStatus } = formState;

  return (
    <div {...stylex.props(styles.wrapper)}>
      <div {...stylex.props(styles.container)}>
       

        <div {...stylex.props(styles.formContent)}>
          <AgeField value={age} onChange={createFieldHandler(FORM_FIELDS.AGE, setFormState)} />
          
          <div {...stylex.props(styles.rowFields)}>
            <div {...stylex.props(styles.fieldHalf)}>
              {isMetric ? (
                <MetricHeightField
                  value={heightMetric}
                  onChange={createFieldHandler(FORM_FIELDS.HEIGHT_METRIC, setFormState)}
                />
              ) : (
                <ImperialHeightField
                  feet={heightFeet}
                  inches={heightInches}
                  onFeetChange={createFieldHandler(FORM_FIELDS.HEIGHT_FEET, setFormState)}
                  onInchesChange={createFieldHandler(FORM_FIELDS.HEIGHT_INCHES, setFormState)}
                />
              )}
            </div>
            
            <div {...stylex.props(styles.fieldHalf)}>
              <WeightField
                value={weight}
                onChange={createFieldHandler(FORM_FIELDS.WEIGHT, setFormState)}
                isMetric={isMetric}
              />
            </div>
          </div>
          
          <SexSelector value={sex} onChange={createFieldHandler(FORM_FIELDS.SEX, setFormState)} />
          
          <SmokingField
            value={smoking}
            onChange={createFieldHandler(FORM_FIELDS.SMOKING, setFormState)}
          />
          
          <BloodPressureMedField
            value={bloodPressureMed}
            onChange={createFieldHandler(FORM_FIELDS.BLOOD_PRESSURE_MED, setFormState)}
          />
          
          <DiabetesStatusField
            value={diabetesStatus}
            onChange={createFieldHandler(FORM_FIELDS.DIABETES_STATUS, setFormState)}
          />
          
          <div {...stylex.props(styles.buttonWrapper)}>
            <Button
              width="160px"
              variant="primary"
              onClick={onSubmit}
              disabled={!isFormValid(formState)}
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormWizard;
