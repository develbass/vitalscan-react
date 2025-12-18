import React, { useMemo, useEffect } from 'react';
import state from '../../state';
import { useSnapshot } from 'valtio';
import ResultsError from './ResultsError';
import { Heading } from '@nuralogix.ai/web-ui';
import type { Results } from './types';

const ResultsComponent = () => {
  const measurementSnap = useSnapshot(state.measurement);
  const { results } = measurementSnap;

  // Injeta Font Awesome para ícones
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[data-vs-fontawesome="true"]');
    if (existing) return;
    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
    linkEl.setAttribute('data-vs-fontawesome', 'true');
    document.head.appendChild(linkEl);
  }, []);

  // Show error if no results OR if only SNR point exists
  const pointKeys = results ? Object.keys(results.points) : [];
  const onlySnrExists = pointKeys.length === 1 && pointKeys[0] === 'SNR';

  if (!results || onlySnrExists) {
    return <ResultsError />;
  }

  // Extrair dados dos pontos
  const resultsData = results.points;

  // Enviar resultados para Rapidoc quando disponíveis
  useEffect(() => {
    if (!results || !resultsData) {
      return;
    }
    console.log('results', resultsData);

    const sendResultsToRapidoc = async () => {
      try {
        // Buscar beneficiaryUuid e clientUuid da URL
        const searchParams = new URLSearchParams(window.location.search);
        let beneficiaryUuid = searchParams.get('beneficiaryUuid');
        let clientUuid = searchParams.get('clientUuid');

        // Se não tiver beneficiaryUuid na URL, buscar do localStorage (salvo após validação do token)
        if (!beneficiaryUuid) {
          beneficiaryUuid = localStorage.getItem('beneficiaryUuid') || null;
        }
        
        // Se não tiver clientUuid na URL, buscar do localStorage
        if (!clientUuid) {
          clientUuid = localStorage.getItem('clientUuid') || null;
        }

        // Buscar token do localStorage
        const token = localStorage.getItem('token') || null;

        // Se não tiver beneficiaryUuid, não envia (não é obrigatório)
        if (!beneficiaryUuid) {
          console.log('[Results] beneficiaryUuid não encontrado na URL nem no identifier, pulando envio para Rapidoc');
          return;
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(beneficiaryUuid)) {
          console.error('[Results] beneficiaryUuid inválido:', beneficiaryUuid);
          return;
        }

        // Extrair measurementId do objeto results (pode estar em measurementId ou identifier)
        const scanUuid = localStorage.getItem('beneficiaryScanUuid')

        if (!scanUuid) {
          console.error('[Results] UUID do scan não encontrado no objeto results');
          return;
        }

        // Transformar dados de results.points para o formato esperado pelo endpoint
        // Cada métrica tem formato: { value: "75.85", channel, notes, dial, meta, info }
        const transformedData: any = {
          uuid: scanUuid,
        };

        // Mapear todas as métricas extraindo o valor numérico
        Object.keys(resultsData).forEach((metricKey) => {
          const metricObj = (resultsData as any)[metricKey];
          if (metricObj && typeof metricObj === 'object' && metricObj.value !== undefined) {
            const value = parseFloat(metricObj.value);
            if (!isNaN(value)) {
              // Adicionar tanto o nome original quanto os nomes alternativos
              transformedData[metricKey] = value;
              
              // Mapear nomes alternativos para compatibilidade
              const nameMapping: { [key: string]: string[] } = {
                'HR_BPM': ['ppm'],
                'BMI_CALC': ['bmi'],
                'SNR': ['snr'],
                'MSI': ['msi'],
                'BP_SYSTOLIC': ['systolic'],
                'BP_DIASTOLIC': ['diastolic'],
                'BR_BPM': ['breathing'],
                'HEALTH_SCORE': ['healthScore'],
                'WAIST_TO_HEIGHT': ['waistToHeight'],
                'HRV_SDNN': ['heartRateVariability'],
                'BP_RPP': ['cardiacWorkload'],
                'ABSI': ['absi'],
                'BP_CVD': ['cvdRisk'],
                'BP_STROKE': ['strokeRisk'],
                'BP_HEART_ATTACK': ['heartAttackRisk'],
                'HPT_RISK_PROB': ['HypertensionRisk'],
                'TG_RISK_PROB': ['HypertriglyceridemiaRisk'],
                'HDLTC_RISK_PROB': ['HypercholesterolemiaRisk'],
                'DBT_RISK_PROB': ['DiabetesRisk'],
                'IHB_COUNT': ['irregularHeartBeats'],
              };

              // Adicionar nomes alternativos se existirem
              if (nameMapping[metricKey]) {
                nameMapping[metricKey].forEach((altName) => {
                  transformedData[altName] = value;
                });
              }
            }
          }
        });

        // Adicionar measurementId se disponível
        if ((results as any).measurementId) {
          transformedData.measurementId = (results as any).measurementId;
        }

        // Adicionar avgStarRating se disponível (pode estar em results)
        if ((results as any).avgStarRating !== undefined) {
          transformedData.avgStarRating = (results as any).avgStarRating;
        }

        // Preparar payload para envio
        const payload = {
          beneficiary: {
            uuid: beneficiaryUuid,
          },
          ...transformedData,
          ...(clientUuid && { clientUuid }),
          ...(token && { token }),
        };

        console.log('[Results] Enviando resultados para Rapidoc:', payload);

        // Chamar endpoint save-results
        const response = await fetch('/api/save-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[Results] Resultados salvos com sucesso na Rapidoc:', result);
      } catch (error) {
        console.error('[Results] Erro ao salvar resultados na Rapidoc:', error);
        // Não interrompe a renderização, apenas loga o erro
      }
    };

    sendResultsToRapidoc();
  }, [results, resultsData]);

  // Funções de classificação necessárias
  type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';

  const formatNumber = (num: number): string => {
    const n = Number(num);
    if (Number.isNaN(n)) return '-';
    return n.toFixed(2);
  };

  function getHealthStatus(metricKey: string, value: number): HealthStatus {
    switch (metricKey) {
      case 'HR_BPM':
        if (value >= 60.0 && value < 100.0) return 'excellent';
        if (value >= 0.0 && value < 60.0) return 'fair';
        if (value >= 100.0 && value <= 140.0) return 'fair';
        return 'poor';
      case 'BP_SYSTOLIC':
        if (value >= 90 && value <= 120) return 'excellent';
        if ((value >= 80 && value < 90) || (value > 120 && value <= 130)) return 'good';
        if ((value >= 70 && value < 80) || (value > 130 && value <= 140)) return 'fair';
        if ((value >= 60 && value < 70) || (value > 140 && value <= 160)) return 'poor';
        return 'very-poor';
      case 'BP_DIASTOLIC':
        if (value >= 60 && value <= 80) return 'excellent';
        if ((value >= 50 && value < 60) || (value > 80 && value <= 85)) return 'good';
        if ((value >= 40 && value < 50) || (value > 85 && value <= 90)) return 'fair';
        if ((value >= 30 && value < 40) || (value > 90 && value <= 100)) return 'poor';
        return 'very-poor';
      case 'BR_BPM':
        if (value >= 12.0 && value < 25.0) return 'excellent';
        if (value >= 1.2 && value < 12.0) return 'fair';
        if (value >= 25.0 && value <= 35.0) return 'fair';
        return 'poor';
      case 'HRV_SDNN':
        if (value >= 51.5) return 'excellent';
        if (value >= 35.5 && value < 51.5) return 'good';
        if (value >= 16.4 && value < 35.5) return 'fair';
        if (value >= 10.8 && value < 16.4) return 'poor';
        return 'very-poor';
      case 'BMI_CALC':
        if (value >= 18.5 && value < 25.0) return 'excellent';
        if (value >= 0.0 && value < 18.5) return 'fair';
        if (value >= 25.0 && value < 28.0) return 'fair';
        if (value >= 28.0 && value <= 35.0) return 'very-poor';
        return 'very-poor';
      case 'MSI':
        if (value >= 1.0 && value < 2.0) return 'excellent';
        if (value >= 2.0 && value < 3.0) return 'good';
        if (value >= 3.0 && value < 4.0) return 'fair';
        if (value >= 4.0 && value < 5.0) return 'poor';
        return 'very-poor';
      case 'HEALTH_SCORE':
        if (value >= 80) return 'excellent';
        if (value >= 60 && value < 80) return 'good';
        if (value >= 40 && value < 60) return 'fair';
        if (value >= 20 && value < 40) return 'poor';
        return 'very-poor';
      case 'PHYSICAL_SCORE':
      case 'MENTAL_SCORE':
      case 'PHYSIO_SCORE':
      case 'VITAL_SCORE':
      case 'RISKS_SCORE':
        if (value >= 4.5) return 'excellent';
        if (value >= 4 && value < 4.5) return 'good';
        if (value >= 3 && value < 4) return 'fair';
        if (value >= 2 && value < 3) return 'poor';
        return 'very-poor';
      case 'BP_CVD':
        if (value >= 0.0 && value < 5.0) return 'excellent';
        if (value >= 5.0 && value < 7.25) return 'good';
        if (value >= 7.25 && value < 10.0) return 'fair';
        if (value >= 10.0 && value < 20.0) return 'poor';
        if (value >= 20.0 && value <= 100.0) return 'very-poor';
        return 'very-poor';
      case 'BP_HEART_ATTACK':
        if (value >= 0.0 && value < 1.32) return 'excellent';
        if (value >= 1.32 && value < 2.81) return 'good';
        if (value >= 2.81 && value < 3.30) return 'fair';
        if (value >= 3.30 && value < 6.60) return 'poor';
        return 'very-poor';
      case 'BP_STROKE':
        if (value >= 0.0 && value < 2.97) return 'excellent';
        if (value >= 2.97 && value < 4.79) return 'good';
        if (value >= 4.79 && value < 6.60) return 'fair';
        if (value >= 6.60 && value < 13.20) return 'poor';
        if (value >= 13.20 && value <= 66.0) return 'very-poor';
        return 'very-poor';
      case 'HPT_RISK_PROB':
      case 'DBT_RISK_PROB':
      case 'HDLTC_RISK_PROB':
      case 'TG_RISK_PROB':
      case 'FLD_RISK_PROB':
      case 'OVERALL_METABOLIC_RISK_PROB':
      case 'HBA1C_RISK_PROB':
      case 'MFBG_RISK_PROB':
        if (value >= 0.0 && value < 25.0) return 'excellent';
        if (value >= 25.0 && value < 45.0) return 'good';
        if (value >= 45.0 && value < 55.0) return 'fair';
        if (value >= 55.0 && value < 77.5) return 'poor';
        if (value >= 77.5 && value <= 100.0) return 'very-poor';
        return 'very-poor';
      case 'IHB_COUNT':
        if (value === 0) return 'excellent';
        if (value >= 1 && value <= 5) return 'good';
        if (value >= 6 && value <= 10) return 'fair';
        if (value >= 11 && value <= 20) return 'poor';
        return 'very-poor';
      case 'WAIST_TO_HEIGHT':
        if (value >= 43.0 && value < 53.0) return 'excellent';
        if ((value >= 0.0 && value < 43.0) || (value >= 53.0 && value < 58.0)) return 'fair';
        if (value >= 58.0 && value < 63.0) return 'poor';
        if (value >= 63.0 && value <= 75.0) return 'very-poor';
        return 'very-poor';
      case 'ABSI':
        if (value >= 0.0 && value < 7.10) return 'excellent';
        if (value >= 7.10 && value < 7.60) return 'good';
        if (value >= 7.60 && value < 8.60) return 'fair';
        if (value >= 8.60 && value < 9.10) return 'poor';
        if (value >= 9.10 && value <= 9.60) return 'very-poor';
        return 'very-poor';
      case 'SNR':
        if (value >= 18) return 'excellent';
        if (value >= 15 && value < 18) return 'good';
        if (value >= 12 && value < 15) return 'fair';
        if (value >= 10 && value < 12) return 'poor';
        return 'very-poor';
      case 'BP_RPP':
        if (value >= 3.71 && value < 3.90) return 'excellent';
        if (value >= 3.90 && value < 4.08) return 'fair';
        if (value >= 4.08 && value < 4.18) return 'poor';
        if (value >= 4.18 && value <= 4.28) return 'very-poor';
        return 'very-poor';
      case 'BP_TAU':
        if (value >= 2.11 && value <= 3.0) return 'excellent';
        if (value >= 1.78 && value < 2.11) return 'good';
        if (value >= 1.12 && value < 1.78) return 'fair';
        if (value >= 0.79 && value < 1.12) return 'poor';
        if (value >= 0.0 && value < 0.79) return 'very-poor';
        return 'very-poor';
      case 'WAIST_CIRCUM':
        if (value < 80) return 'excellent';
        if (value >= 80 && value < 88) return 'good';
        if (value >= 88 && value < 102) return 'fair';
        if (value >= 102 && value < 120) return 'poor';
        return 'very-poor';
      default:
        return 'good';
    }
  }

  function getStatusText(status: HealthStatus): string {
    switch (status) {
      case 'excellent': return 'Ótimo';
      case 'good': return 'Bom';
      case 'fair': return 'Regular';
      case 'poor': return 'Ruim';
      case 'very-poor': return 'Muito Ruim';
      default: return 'Normal';
    }
  }

  function getStatusBackgroundColor(status: HealthStatus): string {
    switch (status) {
      case 'excellent': return '#66D89D';
      case 'good': return '#B3F2B2';
      case 'fair': return '#FFEB86';
      case 'poor': return '#FFA726';
      case 'very-poor': return '#F36565';
      default: return '#66D89D';
    }
  }

  function getNuraLogixStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HR_BPM':
        if (value >= 60.0 && value < 100.0) return 'Normal';
        if (value >= 0.0 && value < 60.0) return 'Baixo';
        if (value >= 100.0 && value <= 140.0) return 'Elevado';
        return 'Fora do Range';
      case 'BR_BPM':
        if (value >= 12.0 && value < 25.0) return 'Normal';
        if (value >= 1.2 && value < 12.0) return 'Baixo';
        if (value >= 25.0 && value <= 35.0) return 'Elevado';
        return 'Fora do Range';
      case 'BP_SYSTOLIC':
        if (value < 120) return 'Normal';
        if (value >= 120 && value < 130) return 'Elevado';
        if (value >= 130 && value < 140) return 'Hipertensão Estágio 1';
        if (value >= 140) return 'Hipertensão Estágio 2';
        return 'Baixo';
      case 'BP_DIASTOLIC':
        if (value < 80) return 'Ótima';
        if (value >= 80 && value < 85) return 'Normal';
        if (value >= 85 && value < 90) return 'Normal Alto';
        if (value >= 90) return 'Hipertensão';
        return 'Baixo';
      case 'IHB_COUNT':
        if (value === 0) return 'Normal';
        if (value >= 1 && value <= 5) return 'Leve';
        if (value >= 6 && value <= 10) return 'Moderado';
        if (value >= 11 && value <= 20) return 'Elevado';
        return 'Muito Elevado';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HR_BPM':
        if (value >= 60.0 && value < 100.0) return '#66D89D';
        return '#FFEB86';
      case 'BR_BPM':
        if (value >= 12.0 && value < 25.0) return '#66D89D';
        return '#FFEB86';
      case 'BP_SYSTOLIC':
        if (value < 120) return '#66D89D';
        if (value >= 120 && value < 130) return '#FFEB86';
        if (value >= 130 && value < 140) return '#FFA726';
        if (value >= 140) return '#F36565';
        return '#FFEB86';
      case 'BP_DIASTOLIC':
        if (value < 80) return '#66D89D';
        if (value >= 80 && value < 85) return '#B3F2B2';
        if (value >= 85 && value < 90) return '#FFEB86';
        if (value >= 90) return '#F36565';
        return '#FFEB86';
      case 'IHB_COUNT':
        if (value === 0) return '#66D89D';
        if (value >= 1 && value <= 5) return '#B3F2B2';
        if (value >= 6 && value <= 10) return '#FFEB86';
        if (value >= 11 && value <= 20) return '#FFA726';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixPhysiologicalStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HRV_SDNN':
        if (value >= 51.5) return 'Excelente';
        if (value >= 35.5 && value < 51.5) return 'Bom';
        if (value >= 16.4 && value < 35.5) return 'Regular';
        if (value >= 10.8 && value < 16.4) return 'Baixo';
        return 'Muito Baixo';
      case 'BP_RPP':
        if (value >= 3.71 && value < 3.90) return 'Ideal';
        if (value >= 3.90 && value < 4.08) return 'Moderado';
        if (value >= 4.08 && value < 4.18) return 'Elevado';
        if (value >= 4.18 && value <= 4.28) return 'Muito Elevado';
        return 'Muito Elevado';
      case 'BP_TAU':
        if (value >= 2.11) return 'Excelente';
        if (value >= 1.78 && value < 2.11) return 'Bom';
        if (value >= 1.12 && value < 1.78) return 'Regular';
        if (value >= 0.79 && value < 1.12) return 'Baixo';
        if (value >= 0.0 && value < 0.79) return 'Muito Baixo';
        return 'Excelente';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixPhysiologicalBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HRV_SDNN':
        if (value >= 51.5) return '#66D89D';
        if (value >= 35.5 && value < 51.5) return '#B3F2B2';
        if (value >= 16.4 && value < 35.5) return '#FFEB86';
        if (value >= 10.8 && value < 16.4) return '#FFA726';
        return '#F36565';
      case 'BP_RPP':
        if (value >= 3.71 && value < 3.90) return '#B3F2B2';
        if (value >= 3.90 && value < 4.08) return '#FFEB86';
        if (value >= 4.08 && value < 4.18) return '#FFA726';
        if (value >= 4.18 && value <= 4.28) return '#F36565';
        return '#F36565';
      case 'BP_TAU':
        if (value >= 2.11) return '#66D89D';
        if (value >= 1.78 && value < 2.11) return '#B3F2B2';
        if (value >= 1.12 && value < 1.78) return '#FFEB86';
        if (value >= 0.79 && value < 1.12) return '#FFA726';
        if (value >= 0.0 && value < 0.79) return '#F36565';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixMentalStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'MSI':
        if (value >= 1.0 && value < 2.0) return 'Relaxado';
        if (value >= 2.0 && value < 3.0) return 'Leve';
        if (value >= 3.0 && value < 4.0) return 'Moderado';
        if (value >= 4.0 && value < 5.0) return 'Elevado';
        return 'Sobrecarregado';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixMentalBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'MSI':
        if (value >= 1.0 && value < 2.0) return '#66D89D';
        if (value >= 2.0 && value < 3.0) return '#B3F2B2';
        if (value >= 3.0 && value < 4.0) return '#FFEB86';
        if (value >= 4.0 && value < 5.0) return '#FFA726';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixPhysicalStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'BMI_CALC':
        if (value >= 18.5 && value < 25.0) return 'Peso Normal';
        if (value >= 0.0 && value < 18.5) return 'Abaixo do Peso';
        if (value >= 25.0 && value < 28.0) return 'Pré-Obesidade';
        if (value >= 28.0 && value <= 35.0) return 'Obesidade';
        return 'Obesidade Grave';
      case 'AGE':
      case 'HEIGHT':
      case 'WEIGHT':
      case 'WAIST_CIRCUM':
        return getStatusText(getHealthStatus(metricKey, value));
      case 'WAIST_TO_HEIGHT':
        if (value >= 43.0 && value < 53.0) return 'Ideal';
        if ((value >= 0.0 && value < 43.0) || (value >= 53.0 && value < 58.0)) return 'Moderado';
        if (value >= 58.0 && value < 63.0) return 'Elevado';
        if (value >= 63.0 && value <= 75.0) return 'Muito Elevado';
        return 'Crítico';
      case 'ABSI':
        if (value >= 0.0 && value < 7.10) return 'Ideal';
        if (value >= 7.10 && value < 7.60) return 'Bom';
        if (value >= 7.60 && value < 8.60) return 'Moderado';
        if (value >= 8.60 && value < 9.10) return 'Elevado';
        if (value >= 9.10 && value <= 9.60) return 'Muito Elevado';
        return 'Crítico';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixPhysicalBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'BMI_CALC':
        if (value >= 18.5 && value < 25.0) return '#66D89D';
        if (value >= 0.0 && value < 18.5) return '#FFEB86';
        if (value >= 25.0 && value < 28.0) return '#FFEB86';
        if (value >= 28.0 && value <= 35.0) return '#F36565';
        return '#F36565';
      case 'AGE':
      case 'HEIGHT':
      case 'WEIGHT':
      case 'WAIST_CIRCUM':
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
      case 'WAIST_TO_HEIGHT':
        if (value >= 43.0 && value < 53.0) return '#66D89D';
        if ((value >= 0.0 && value < 43.0) || (value >= 53.0 && value < 58.0)) return '#FFEB86';
        if (value >= 58.0 && value < 63.0) return '#FFA726';
        if (value >= 63.0 && value <= 75.0) return '#F36565';
        return '#F36565';
      case 'ABSI':
        if (value >= 0.0 && value < 7.10) return '#66D89D';
        if (value >= 7.10 && value < 7.60) return '#B3F2B2';
        if (value >= 7.60 && value < 8.60) return '#FFEB86';
        if (value >= 8.60 && value < 9.10) return '#FFA726';
        if (value >= 9.10 && value <= 9.60) return '#F36565';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixGeneralRisksStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'BP_CVD':
        if (value >= 0.0 && value < 5.0) return 'Muito Baixo';
        if (value >= 5.0 && value < 7.25) return 'Baixo';
        if (value >= 7.25 && value < 10.0) return 'Moderado';
        if (value >= 10.0 && value < 20.0) return 'Alto';
        if (value >= 20.0 && value <= 100.0) return 'Muito Alto';
        return 'Crítico';
      case 'BP_HEART_ATTACK':
        if (value >= 0.0 && value < 1.32) return 'Muito Baixo';
        if (value >= 1.32 && value < 2.81) return 'Baixo';
        if (value >= 2.81 && value < 3.30) return 'Moderado';
        if (value >= 3.30 && value < 6.60) return 'Alto';
        return 'Muito Alto';
      case 'BP_STROKE':
        if (value >= 0.0 && value < 2.97) return 'Muito Baixo';
        if (value >= 2.97 && value < 4.79) return 'Baixo';
        if (value >= 4.79 && value < 6.60) return 'Moderado';
        if (value >= 6.60 && value < 13.20) return 'Alto';
        if (value >= 13.20 && value <= 66.0) return 'Muito Alto';
        return 'Crítico';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixGeneralRisksBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'BP_CVD':
        if (value >= 0.0 && value < 5.0) return '#66D89D';
        if (value >= 5.0 && value < 7.25) return '#B3F2B2';
        if (value >= 7.25 && value < 10.0) return '#FFEB86';
        if (value >= 10.0 && value < 20.0) return '#FFA726';
        if (value >= 20.0 && value <= 100.0) return '#F36565';
        return '#F36565';
      case 'BP_HEART_ATTACK':
        if (value >= 0.0 && value < 1.32) return '#66D89D';
        if (value >= 1.32 && value < 2.81) return '#B3F2B2';
        if (value >= 2.81 && value < 3.30) return '#FFEB86';
        if (value >= 3.30 && value < 6.60) return '#FFA726';
        return '#F36565';
      case 'BP_STROKE':
        if (value >= 0.0 && value < 2.97) return '#66D89D';
        if (value >= 2.97 && value < 4.79) return '#B3F2B2';
        if (value >= 4.79 && value < 6.60) return '#FFEB86';
        if (value >= 6.60 && value < 13.20) return '#FFA726';
        if (value >= 13.20 && value <= 66.0) return '#F36565';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixMetabolicRisksStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HPT_RISK_PROB':
      case 'DBT_RISK_PROB':
      case 'HDLTC_RISK_PROB':
      case 'TG_RISK_PROB':
      case 'FLD_RISK_PROB':
      case 'OVERALL_METABOLIC_RISK_PROB':
        if (value >= 0.0 && value < 25.0) return 'Muito Baixo';
        if (value >= 25.0 && value < 45.0) return 'Baixo';
        if (value >= 45.0 && value < 55.0) return 'Moderado';
        if (value >= 55.0 && value < 77.5) return 'Alto';
        if (value >= 77.5 && value <= 100.0) return 'Muito Alto';
        return 'Crítico';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixMetabolicRisksBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HPT_RISK_PROB':
      case 'DBT_RISK_PROB':
      case 'HDLTC_RISK_PROB':
      case 'TG_RISK_PROB':
      case 'FLD_RISK_PROB':
      case 'OVERALL_METABOLIC_RISK_PROB':
        if (value >= 0.0 && value < 25.0) return '#66D89D';
        if (value >= 25.0 && value < 45.0) return '#B3F2B2';
        if (value >= 45.0 && value < 55.0) return '#FFEB86';
        if (value >= 55.0 && value < 77.5) return '#FFA726';
        if (value >= 77.5 && value <= 100.0) return '#F36565';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixBloodBiomarkersStatusText(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HBA1C_RISK_PROB':
      case 'MFBG_RISK_PROB':
        if (value >= 0.0 && value < 25.0) return 'Muito Baixo';
        if (value >= 25.0 && value < 45.0) return 'Baixo';
        if (value >= 45.0 && value < 55.0) return 'Moderado';
        if (value >= 55.0 && value < 77.5) return 'Alto';
        if (value >= 77.5 && value <= 100.0) return 'Muito Alto';
        return 'Crítico';
      default:
        return getStatusText(getHealthStatus(metricKey, value));
    }
  }

  function getNuraLogixBloodBiomarkersBackgroundColor(metricKey: string, value: number): string {
    switch (metricKey) {
      case 'HBA1C_RISK_PROB':
      case 'MFBG_RISK_PROB':
        if (value >= 0.0 && value < 25.0) return '#66D89D';
        if (value >= 25.0 && value < 45.0) return '#B3F2B2';
        if (value >= 45.0 && value < 55.0) return '#FFEB86';
        if (value >= 55.0 && value < 77.5) return '#FFA726';
        if (value >= 77.5 && value <= 100.0) return '#F36565';
        return '#F36565';
      default:
        return getStatusBackgroundColor(getHealthStatus(metricKey, value));
    }
  }

  // Nomes, unidades, faixas e ícones
  const iconMapping: { [key: string]: string } = {
    HR_BPM: 'fa-heart-pulse',
    BP_SYSTOLIC: 'fa-gauge-high',
    BP_DIASTOLIC: 'fa-heart-pulse',
    BR_BPM: 'fa-lungs',
    HRV_SDNN: 'fa-wave-square',
    BP_RPP: 'fa-gauge-simple-high',
    MSI: 'fa-brain',
    HEALTH_SCORE: 'fa-heart-circle-check',
    PHYSICAL_SCORE: 'fa-dumbbell',
    PHYSIO_SCORE: 'fa-user',
    MENTAL_SCORE: 'fa-brain',
    VITAL_SCORE: 'fa-heart-pulse',
    RISKS_SCORE: 'fa-exclamation-triangle',
    BMI_CALC: 'fa-weight-scale',
    WAIST_CIRCUM: 'fa-ruler-horizontal',
    WAIST_TO_HEIGHT: 'fa-ruler-combined',
    ABSI: 'fa-shapes',
    BP_CVD: 'fa-heart-crack',
    BP_STROKE: 'fa-brain',
    BP_HEART_ATTACK: 'fa-heart-crack',
    HPT_RISK_PROB: 'fa-arrow-up',
    DBT_RISK_PROB: 'fa-syringe',
    HDLTC_RISK_PROB: 'fa-vials',
    TG_RISK_PROB: 'fa-droplet',
    FLD_RISK_PROB: 'fa-liver',
    OVERALL_METABOLIC_RISK_PROB: 'fa-dna',
    HBA1C_RISK_PROB: 'fa-vial',
    MFBG_RISK_PROB: 'fa-tint',
    IHB_COUNT: 'fa-heartbeat',
    SNR: 'fa-signal',
    BP_TAU: 'fa-arrows-alt-v',
  };

  const portugueseNames: { [key: string]: string } = {
    HR_BPM: 'Frequência Cardíaca',
    BP_SYSTOLIC: 'Pressão Arterial Sistólica',
    BP_DIASTOLIC: 'Pressão Arterial Diastólica',
    BR_BPM: 'Frequência Respiratória',
    HRV_SDNN: 'Variabilidade da Frequência Cardíaca',
    BP_RPP: 'Carga Cardíaca',
    BP_TAU: 'Capacidade Vascular',
    MSI: 'Índice de Estresse Mental',
    HEALTH_SCORE: 'Pontuação de Saúde Geral',
    PHYSICAL_SCORE: 'Pontuação Física',
    PHYSIO_SCORE: 'Pontuação Fisiológica',
    MENTAL_SCORE: 'Pontuação Mental',
    VITAL_SCORE: 'Pontuação de Sinais Vitais',
    RISKS_SCORE: 'Pontuação de Riscos',
    BMI_CALC: 'Índice de Massa Corporal',
    WAIST_CIRCUM: 'Circunferência da Cintura',
    WAIST_TO_HEIGHT: 'Relação Cintura-Altura',
    ABSI: 'Índice de Forma Corporal',
    BP_CVD: 'Risco de Doença Cardiovascular',
    BP_STROKE: 'Risco de AVC',
    BP_HEART_ATTACK: 'Risco de Ataque Cardíaco',
    HPT_RISK_PROB: 'Risco de Hipertensão',
    DBT_RISK_PROB: 'Risco de Diabetes Tipo 2',
    HDLTC_RISK_PROB: 'Risco de Hipercolesterolemia',
    TG_RISK_PROB: 'Risco de Hipertrigliceridemia',
    FLD_RISK_PROB: 'Risco de Doença Hepática Gordurosa',
    OVERALL_METABOLIC_RISK_PROB: 'Risco Metabólico Geral',
    HBA1C_RISK_PROB: 'Risco de Hemoglobina A1C Elevada',
    MFBG_RISK_PROB: 'Risco de Glicose em Jejum Elevada',
    IHB_COUNT: 'Batimentos Irregulares',
    SNR: 'Relação Sinal-Ruído',
    AGE: 'Idade da Pele Facial',
    HEIGHT: 'Altura Estimada',
    WEIGHT: 'Peso Estimado',
  };

  const portugueseUnits: { [key: string]: string } = {
    HR_BPM: 'BPM',
    BP_SYSTOLIC: 'mmHg',
    BP_DIASTOLIC: 'mmHg',
    BR_BPM: 'resp/min',
    HRV_SDNN: 'ms',
    BP_RPP: 'dB',
    BP_TAU: '',
    MSI: '',
    HEALTH_SCORE: '/100',
    PHYSICAL_SCORE: '/5',
    PHYSIO_SCORE: '/5',
    MENTAL_SCORE: '/5',
    VITAL_SCORE: '/5',
    RISKS_SCORE: '/5',
    BMI_CALC: 'kg/m²',
    WAIST_CIRCUM: 'cm',
    WAIST_TO_HEIGHT: '%',
    ABSI: '',
    BP_CVD: '%',
    BP_STROKE: '%',
    BP_HEART_ATTACK: '%',
    HPT_RISK_PROB: '%',
    DBT_RISK_PROB: '%',
    HDLTC_RISK_PROB: '%',
    TG_RISK_PROB: '%',
    FLD_RISK_PROB: '%',
    OVERALL_METABOLIC_RISK_PROB: '%',
    HBA1C_RISK_PROB: '%',
    MFBG_RISK_PROB: '%',
    IHB_COUNT: '',
    SNR: 'dB',
  };

  const measurementRanges: { [key: string]: string } = {
    HR_BPM: '0 a 140 BPM',
    BP_SYSTOLIC: '45 a 180 mmHg',
    BP_DIASTOLIC: '30 a 120 mmHg',
    BR_BPM: '1.2 a 35 resp/min',
    HRV_SDNN: '1 a 80 ms',
    BP_RPP: '3.71 a 4.28 dB',
    BP_TAU: 'Varia conforme medição',
    MSI: '1 a 5.9',
    HEALTH_SCORE: '0 a 100',
    PHYSICAL_SCORE: '1 a 5',
    PHYSIO_SCORE: '1 a 5',
    MENTAL_SCORE: '1 a 5',
    VITAL_SCORE: '1 a 5',
    RISKS_SCORE: '1 a 5',
    BMI_CALC: '10 a 65 kg/m²',
    WAIST_CIRCUM: 'Medida em cm',
    WAIST_TO_HEIGHT: '25 a 70%',
    ABSI: '6.19 a 8.83',
    BP_CVD: '0 a 100%',
    BP_STROKE: '0 a 100%',
    BP_HEART_ATTACK: '0 a 100%',
    HPT_RISK_PROB: '0 a 100%',
    DBT_RISK_PROB: '0 a 100%',
    HDLTC_RISK_PROB: '0 a 100%',
    TG_RISK_PROB: '0 a 100%',
    FLD_RISK_PROB: '0 a 100%',
    OVERALL_METABOLIC_RISK_PROB: '0 a 100%',
    HBA1C_RISK_PROB: '0 a 100%',
    MFBG_RISK_PROB: '0 a 100%',
    IHB_COUNT: 'Contagem de batimentos',
    SNR: '10 a 20 dB',
  };

  const categories = {
    vitals: { title: 'Sinais Vitais', metrics: ['HR_BPM', 'BP_SYSTOLIC', 'BP_DIASTOLIC', 'BR_BPM', 'IHB_COUNT'] },
    physiological: { title: 'Fisiológicos', metrics: ['HRV_SDNN', 'BP_RPP', 'BP_TAU'] },
    mental: { title: 'Mental', metrics: ['MSI'] },
    physical: { title: 'Físico', metrics: ['BMI_CALC', 'WAIST_CIRCUM', 'WAIST_TO_HEIGHT', 'ABSI'] },
    generalRisks: { title: 'Riscos Gerais', metrics: ['BP_CVD', 'BP_HEART_ATTACK', 'BP_STROKE'] },
    metabolicRisks: { title: 'Riscos Metabólicos', metrics: ['HPT_RISK_PROB', 'DBT_RISK_PROB', 'HDLTC_RISK_PROB', 'TG_RISK_PROB', 'FLD_RISK_PROB', 'OVERALL_METABOLIC_RISK_PROB'] },
    bloodBiomarkers: { title: 'Biomarcadores Sanguíneos', metrics: ['HBA1C_RISK_PROB', 'MFBG_RISK_PROB'] },
    overall: { title: 'Pontuações Gerais', metrics: ['HEALTH_SCORE', 'MENTAL_SCORE', 'PHYSICAL_SCORE', 'PHYSIO_SCORE', 'VITAL_SCORE', 'RISKS_SCORE'] },
  } as const;

  const styles = useMemo(() => `
* { box-sizing: border-box; }
.vs-results { 
  width: 100%; 
  max-width: 100%; 
  box-sizing: border-box;
  overflow-x: hidden;
}
.vs-results h1, .vs-results h2 { 
  color: #333; 
  border-bottom: 2px solid #eee; 
  padding-bottom: 10px; 
  box-sizing: border-box;
}
.vs-results .result-container { 
  background: #fff; 
  border-radius: 8px; 
  margin-top: 20px; 
  width: 100%; 
  box-sizing: border-box;
  padding: 0;
}
.vs-results .section-group { 
  margin: 25px 0; 
  width: 100%; 
  box-sizing: border-box;
}
.vs-results .section-title { 
  color: #0066cc; 
  margin-top: 0; 
  margin-bottom: 16px; 
  font-size: 1.3em; 
  box-sizing: border-box;
}
.vs-results .card-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
  gap: 20px; 
  width: 100%; 
  max-width: 100%;
  box-sizing: border-box;
}
.vs-results .metric-card { 
  background-color: #66D89D; 
  border-radius: 20px; 
  padding: 32px; 
  box-sizing: border-box; 
  color: #1F1F1F; 
  display: flex; 
  flex-direction: column; 
  align-items: flex-start; 
  position: relative; 
  transition: all 0.3s ease;
  min-height: 200px;
  width: 100%;
}
.vs-results .metric-card:hover { transform: translateY(-2px); }
.vs-results .header { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  font-size: 20px; 
  font-weight: 600; 
  margin-bottom: 24px; 
  color: black; 
  width: 100%;
  box-sizing: border-box;
}
.vs-results .header .icon { font-size: 24px; }
.vs-results .value { 
  font-size: 48px; 
  font-weight: bold; 
  line-height: 1; 
  color: black;
  word-break: break-word;
}
.vs-results .unit { 
  font-size: 24px; 
  margin-left: 4px; 
  color: black; 
}
.vs-results .range { 
  font-size: 14px; 
  margin-top: 8px; 
  color: black;
  word-break: break-word;
}
.vs-results .status { 
  font-size: 20px; 
  font-weight: 600; 
  margin-top: 24px; 
  color: black;
  word-break: break-word;
}

/* Responsividade melhorada */
@media (min-width: 1400px) { 
  .vs-results .card-grid { 
    grid-template-columns: repeat(3, 1fr); 
    gap: 24px;
  } 
}
@media (min-width: 1024px) and (max-width: 1399px) { 
  .vs-results .card-grid { 
    grid-template-columns: repeat(3, 1fr); 
    gap: 20px;
  } 
}
@media (min-width: 768px) and (max-width: 1023px) { 
  .vs-results .card-grid { 
    grid-template-columns: repeat(2, 1fr); 
    gap: 16px;
  } 
}
@media (max-width: 767px) { 
  .vs-results .card-grid { 
    grid-template-columns: 1fr; 
    gap: 16px;
  } 
  .vs-results .metric-card { 
    padding: 20px; 
    min-height: 180px;
  } 
  .vs-results .header { 
    font-size: 18px;
    gap: 8px;
  } 
  .vs-results .value { font-size: 36px; } 
  .vs-results .unit { font-size: 20px; } 
  .vs-results h1, .vs-results h2 { font-size: 1.15em; } 
  .vs-results .section-title { font-size: 1.08em; } 
  .vs-results .result-container { padding: 0; } 
  .vs-results .range { font-size: 13px; }
  .vs-results .status { font-size: 18px; }
}

@media (max-width: 480px) {
  .vs-results .card-grid { 
    gap: 12px;
  }
  .vs-results .metric-card { 
    padding: 16px; 
    min-height: 160px;
  }
  .vs-results .section-group {
    margin: 20px 0;
  }
  .vs-results .header { 
    font-size: 16px;
    gap: 6px;
    margin-bottom: 16px;
  }
  .vs-results .header .icon { 
    font-size: 20px; 
  }
  .vs-results .value { 
    font-size: 32px; 
  }
  .vs-results .unit { 
    font-size: 18px; 
  }
  .vs-results .range { 
    font-size: 12px;
    margin-top: 6px;
  }
  .vs-results .status { 
    font-size: 16px;
    margin-top: 16px;
  }
  .vs-results .section-title { 
    font-size: 1em;
    margin-bottom: 12px;
  }
}

/* Container externo responsivo */
@media (max-width: 767px) {
  body .vs-results-wrapper {
    padding: 16px !important;
  }
}

@media (max-width: 480px) {
  body .vs-results-wrapper {
    padding: 12px !important;
  }
}
`, []);

  const renderCards = () => {
    return (
      <div className="vs-results">
        <div className="result-container">
          {Object.entries(categories).map(([sectionKey, category]) => (
            <div className="section-group" key={sectionKey}>
              <div className="section-title">{category.title}</div>
              <div className="card-grid">
                {(category.metrics as readonly string[]).map((metricKey: string) => {
                  // Extrair o objeto da métrica
                  const metricObj = (resultsData as any)[metricKey];
                  
                  // Verificar se o objeto da métrica existe
                  if (!metricObj || typeof metricObj !== 'object' || !metricObj.value) return null;
                  
                  // Extrair o valor e converter de string para número
                  const raw = parseFloat(metricObj.value);
                  
                  // Verificar se a conversão foi bem-sucedida
                  if (isNaN(raw)) return null;
                  
                  let displayValue: number = raw;
                  let classificationValue: number = raw;

                  // status e cor
                  const vitals = ['HR_BPM', 'BP_SYSTOLIC', 'BP_DIASTOLIC', 'BR_BPM', 'IHB_COUNT'];
                  const physiological = ['HRV_SDNN', 'BP_RPP', 'BP_TAU'];
                  const mental = ['MSI'];
                  const physical = ['BMI_CALC', 'AGE', 'WAIST_TO_HEIGHT', 'ABSI', 'HEIGHT', 'WEIGHT', 'WAIST_CIRCUM'];
                  const generalRisks = ['BP_CVD', 'BP_HEART_ATTACK', 'BP_STROKE'];
                  const metabolicRisks = ['HPT_RISK_PROB', 'DBT_RISK_PROB', 'HDLTC_RISK_PROB', 'TG_RISK_PROB', 'FLD_RISK_PROB', 'OVERALL_METABOLIC_RISK_PROB'];
                  const bloodBiomarkers = ['HBA1C_RISK_PROB', 'MFBG_RISK_PROB'];

                  let backgroundColor = '#66D89D';
                  let statusText = '';
                  
                  if (vitals.includes(metricKey)) {
                    backgroundColor = getNuraLogixBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixStatusText(metricKey, classificationValue);
                  } else if (physiological.includes(metricKey)) {
                    backgroundColor = getNuraLogixPhysiologicalBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixPhysiologicalStatusText(metricKey, classificationValue);
                  } else if (mental.includes(metricKey)) {
                    backgroundColor = getNuraLogixMentalBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixMentalStatusText(metricKey, classificationValue);
                  } else if (physical.includes(metricKey)) {
                    backgroundColor = getNuraLogixPhysicalBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixPhysicalStatusText(metricKey, classificationValue);
                  } else if (generalRisks.includes(metricKey)) {
                    backgroundColor = getNuraLogixGeneralRisksBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixGeneralRisksStatusText(metricKey, classificationValue);
                  } else if (metabolicRisks.includes(metricKey)) {
                    backgroundColor = getNuraLogixMetabolicRisksBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixMetabolicRisksStatusText(metricKey, classificationValue);
                  } else if (bloodBiomarkers.includes(metricKey)) {
                    backgroundColor = getNuraLogixBloodBiomarkersBackgroundColor(metricKey, classificationValue);
                    statusText = getNuraLogixBloodBiomarkersStatusText(metricKey, classificationValue);
                  } else {
                    const status = getHealthStatus(metricKey, classificationValue);
                    backgroundColor = getStatusBackgroundColor(status);
                    statusText = getStatusText(status);
                  }

                  const icon = iconMapping[metricKey] || 'fa-chart-line';
                  const name = portugueseNames[metricKey] || metricKey;
                  const unit = portugueseUnits[metricKey] || '';
                  const range = measurementRanges[metricKey] || '';

                  return (
                    <div className="metric-card" style={{ backgroundColor }} key={metricKey}>
                      <div className="header">
                        <i className={`fas ${icon} icon`} />
                        <span>{name}</span>
                      </div>
                      <div>
                        <span className="value">{formatNumber(displayValue)}</span>
                        <span className="unit">{unit}</span>
                      </div>
                      {range ? <div className="range">Faixa de medição: {range}</div> : null}
                      <div className="status">{statusText}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <style>{styles}</style>
      </div>
    );
  };

  return (
    <div 
      className="vs-results-wrapper"
      style={{ 
        width: '100%', 
        maxWidth: '100%', 
        margin: 0, 
        padding: '20px', 
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {renderCards()}
    </div>
  );
};

export default ResultsComponent;
