/**
 * Classe centralizada para todas as chamadas à API Rapidoc
 * Pode ser usada tanto no servidor quanto no cliente
 */

import type { WMSConfig } from '../types/index.ts';
import { logCurlRequest } from './networkUtils.ts';

export interface RapidocApiConfig {
  rapidocApiUrl?: string;
  rapidocToken?: string;
  temaApiUrl?: string;
  clientUuid?: string;
}

export interface Beneficiary {
  uuid: string;
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  cpf?: string;
}

export interface HealthInformationsPayload {
  beneficiary: Beneficiary;
  height: number;
  weight: number;
  smoke: boolean | string;
  medicationHypertension: boolean | string;
  gender: string;
  diabetes: string;
}

export interface ValidateTokenResponse {
  allowBeneficiaryScan: boolean;
  beneficiaryScanUuid?: string;
  clientUuid?: string;
}

export class RapidocApiClient {
  private config: WMSConfig['environments'];

  constructor(config: WMSConfig = {}) {
    this.config = config.environments || {};
  }

  /**
   * Valida token Rapidoc para permitir scan
   */
  async validateToken(
    token: string,
    beneficiaryUuid: string,
    clientUuid: string
  ): Promise<ValidateTokenResponse> {
    const { RPDADMIN_TOKEN, TEMA_URL, RPD_CLIENTID, API_URL } = this.config || {};

    console.log('config', this.config);

    console.log('rapidocToken', RPDADMIN_TOKEN);
    console.log('temaApiUrl', TEMA_URL);
    console.log('headerClientUuid', RPD_CLIENTID);

    if (!RPD_CLIENTID) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    // Validar formato do UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(beneficiaryUuid)) {
      throw new Error('beneficiaryUuid deve estar no formato UUID válido');
    }

    const validateUrl = `${TEMA_URL}beneficiary-scans/validate-vitalscan?beneficiaryUuid=${beneficiaryUuid}&clientUuid=${clientUuid}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'clientId': RPD_CLIENTID,
      'consumes': 'application/json',
      'content-type': 'application/vnd.rapidoc.tema-v2+json',
      'produces': 'application/json',
      'token': token || '',
    };

    console.log('headers', headers);

    console.log('validateUrl', validateUrl);

    logCurlRequest(validateUrl, {
      method: 'GET',
      headers,
    });

    const response = await fetch(validateUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        console.error('Não foi possível ler o corpo da resposta de erro');
      }

      throw new Error(
        `Erro ao validar token Rapidoc: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      );
    }

    return await response.json();
  }

  /**
   * Busca informações de saúde do beneficiário
   */
  async fetchBeneficiaryHealthInformations(
    beneficiaryUuid: string,
    clientUuid?: string
  ): Promise<any> {
    const { API_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const urlClientUuid = clientUuid || RPD_CLIENTID;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    if (!urlClientUuid) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env ou passe como parâmetro.');
    }

    const healthInfoUrl = `${API_URL}v1/beneficiary-health-informations`;
    const requestUrl = `${healthInfoUrl}?beneficiaryUuid=${encodeURIComponent(beneficiaryUuid)}&clientUuid=${encodeURIComponent(urlClientUuid)}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': RPD_CLIENTID || '',
    };

    logCurlRequest(requestUrl, {
      method: 'GET',
      headers,
    });

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('Resposta de erro da API externa:', errorBody);
      } catch (e) {
        console.error('Não foi possível ler o corpo da resposta de erro');
      }

      throw new Error(
        `Erro ao buscar informações de saúde: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      );
    }

    const rawHealthData = await response.json();

    const mapInboundSmoke = (value: unknown): boolean | string | undefined => {
      if (value === undefined || value === null) return undefined;
      const v = String(value).toLowerCase();
      if (v === 'true' || v === 'yes') return true;
      if (v === 'false' || v === 'no') return false;
      return value as boolean | string;
    };

    const mapInboundMedication = (value: unknown): boolean | string | undefined => {
      if (value === undefined || value === null) return undefined;
      const v = String(value).toLowerCase();
      if (v === 'true' || v === 'yes') return true;
      if (v === 'false' || v === 'no') return false;
      return value as boolean | string;
    };

    const mapInboundGender = (value: unknown): string | undefined => {
      if (value === undefined || value === null) return undefined;
      const v = String(value).toUpperCase();
      if (v === 'MASCULINE' || v === 'M') return 'male';
      if (v === 'FEMININE' || v === 'F') return 'female';
      return String(value);
    };

    const mapInboundDiabetes = (value: unknown): string | undefined => {
      if (value === undefined || value === null) return undefined;
      const v = String(value).toUpperCase();
      if (v === 'ONE') return 'TYPE1';
      if (v === 'TWO') return 'TYPE2';
      if (v === 'NON') return 'NON';
      return String(value);
    };

    const normalizeRecord = (record: any) => {
      if (!record || typeof record !== 'object') return record;
      return {
        ...record,
        smoke: mapInboundSmoke(record.smoke),
        medicationHypertension: mapInboundMedication(record.medicationHypertension),
        gender: mapInboundGender(record.gender),
        diabetes: mapInboundDiabetes(record.diabetes),
      };
    };

    // Retornar apenas o primeiro objeto do array se for um array, já normalizado
    if (Array.isArray(rawHealthData) && rawHealthData.length > 0) {
      return normalizeRecord(rawHealthData[0]);
    }

    return normalizeRecord(rawHealthData);
  }

  /**
   * Salva informações de saúde do beneficiário
   */
  async saveHealthInformations(
    data: HealthInformationsPayload,
    clientUuid?: string
  ): Promise<any> {
    const { API_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const urlClientUuid = clientUuid || RPD_CLIENTID;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    if (!RPD_CLIENTID) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env.');
    }

    // Validações
    if (!data.beneficiary?.uuid) {
      throw new Error('beneficiary.uuid é obrigatório');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.beneficiary.uuid)) {
      throw new Error('beneficiary.uuid deve estar no formato UUID válido');
    }

    if (!data.height || !data.weight || !data.gender || data.diabetes === undefined || data.diabetes === null) {
      throw new Error('height, weight, gender e diabetes são obrigatórios');
    }

    // Validar números
    const heightNum = Number(data.height);
    const weightNum = Number(data.weight);

    if (isNaN(heightNum) || isNaN(weightNum)) {
      throw new Error('height e weight devem ser números válidos');
    }

    if (heightNum < 50 || heightNum > 250) {
      throw new Error('height deve estar entre 50 e 250 cm');
    }

    if (weightNum < 20 || weightNum > 300) {
      throw new Error('weight deve estar entre 20 e 300 kg');
    }

    // Normalizar flags e campos para formato esperado pela Rapidoc / banco
    const normalizeSmoke = (smoke: boolean | string) => {
      const value = String(smoke).toLowerCase();
      if (value === 'yes' || value === 'true' || value === '1') return 'true';
      if (value === 'no' || value === 'false' || value === '0') return 'false';
      return value;
    };

    const normalizeMedicationHypertension = (med: boolean | string) => {
      const value = String(med).toLowerCase();
      if (value === 'yes' || value === 'true' || value === '1') return 'true';
      if (value === 'no' || value === 'false' || value === '0') return 'false';
      return value;
    };

    const normalizeGender = (gender: string) => {
      const genderStr = String(gender).toLowerCase();
      if (['male', 'm', 'masculino', 'masculine'].includes(genderStr)) return 'MASCULINE';
      if (['female', 'f', 'feminino', 'feminine'].includes(genderStr)) return 'FEMININE';
      return genderStr.toUpperCase();
    };

    const normalizeDiabetes = (diabetes: string) => {
      const d = String(diabetes).toLowerCase();
      if (d === 'type1' || d === 'one') return 'ONE';
      if (d === 'type2' || d === 'two') return 'TWO';
      if (['non', 'none', 'no', 'nenhum'].includes(d)) return 'NON';
      return d.toUpperCase();
    };

    const beneficiaryPayload: Beneficiary = {
      uuid: data.beneficiary.uuid,
      ...(data.beneficiary.name && { name: data.beneficiary.name }),
      ...(data.beneficiary.email && { email: data.beneficiary.email }),
      ...(data.beneficiary.phone && { phone: data.beneficiary.phone }),
      ...(data.beneficiary.birthDate && { birthDate: data.beneficiary.birthDate }),
      ...(data.beneficiary.cpf && { cpf: data.beneficiary.cpf }),
    };

    const payload = {
      beneficiary: beneficiaryPayload,
      height: heightNum,
      weight: weightNum,
      smoke: normalizeSmoke(data.smoke),
      medicationHypertension: normalizeMedicationHypertension(data.medicationHypertension),
      gender: normalizeGender(data.gender),
      diabetes: normalizeDiabetes(data.diabetes),
    };

    const apiUrl = API_URL + 'v1/beneficiary-health-informations';
    const finalUrl = `${apiUrl}?clientUuid=${urlClientUuid}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': RPD_CLIENTID,
    };

    logCurlRequest(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('Resposta de erro da API externa:', errorBody);
      } catch (e) {
        console.error('Não foi possível ler o corpo da resposta de erro');
      }

      throw new Error(
        `Erro ao salvar informações de saúde na API externa: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      );
    }

    return await response.json();
  }

  /**
   * Salva resultados do scan (POST)
   */
  async saveResults(
    resultsObj: any,
    beneficiary: Beneficiary,
    clientUuid?: string,
    clientUuidParam?: string
  ): Promise<any> {
    const { API_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const finalClientUuid = clientUuid || RPD_CLIENTID;
    const urlClientUuid = clientUuidParam || finalClientUuid;

    if (!finalClientUuid) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env ou passe como parâmetro.');
    }

    if (!beneficiary?.uuid) {
      throw new Error('beneficiary.uuid é obrigatório. Configure BENEFICIARY_UUID no .env ou passe como parâmetro.');
    }

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    const payload = {
      ...resultsObj,
      beneficiary,
    };

    const finalUrl = `${API_URL}v1/beneficiary-scans?clientUuid=${urlClientUuid}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': RPD_CLIENTID || '',
    };

    logCurlRequest(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar resultado na API externa: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Atualiza resultados do scan (PUT)
   */
  async updateResults(
    resultsObj: any,
    beneficiary: Beneficiary,
    clientUuid?: string,
    clientUuidParam?: string
  ): Promise<boolean> {
    const { TEMA_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const finalClientUuid = clientUuid || RPD_CLIENTID;

    if (!finalClientUuid) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env ou passe como parâmetro.');
    }

    if (!beneficiary?.uuid) {
      throw new Error('beneficiary.uuid é obrigatório. Configure BENEFICIARY_UUID no .env ou passe como parâmetro.');
    }

    if (!TEMA_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure TEMA_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    if (!resultsObj?.uuid) {
      throw new Error('resultsObj.uuid é obrigatório para atualização.');
    }

    const payload = {
      ...resultsObj,
      beneficiary,
    };

    const finalUrl = `${TEMA_URL}beneficiary-scans/${resultsObj.uuid}?clientUuid=${clientUuidParam || finalClientUuid}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json',
      'consumes': 'application/json',
      'clientId': finalClientUuid,
    };

    logCurlRequest(finalUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    const response = await fetch(finalUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.status !== 204) {
      throw new Error(`Erro ao atualizar resultado na API externa: ${response.status} ${response.statusText}`);
    }

    return true;
  }

  /**
   * Busca dados do scan
   */
  async fetchBeneficiaryScans(
    beneficiaryScanUuid: string,
    clientUuid?: string,
    clientUuidParam?: string
  ): Promise<any> {
    const { API_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const finalClientUuid = clientUuid || RPD_CLIENTID;
    const urlClientUuid = clientUuidParam || finalClientUuid;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!finalClientUuid) {
      throw new Error('clientUuid é obrigatório. Configure NEXT_PUBLIC_RPD_CLIENTID no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    const urlFetch = `${API_URL}v1/beneficiary-scans/${beneficiaryScanUuid}?clientUuid=${urlClientUuid}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': finalClientUuid,
    };

    logCurlRequest(urlFetch, {
      method: 'GET',
      headers,
    });

    const response = await fetch(urlFetch, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar dados do scan: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Busca beneficiário por CPF
   */
  async fetchBeneficiaryCpf(cpf: string, clientUuid?: string): Promise<any> {
    const { API_URL, RPDADMIN_TOKEN, RPD_CLIENTID } = this.config || {};
    const finalClientUuid = clientUuid || RPD_CLIENTID;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    const healthInfoUrl = `${API_URL}v1/beneficiaries/cpf/${cpf}`;

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': finalClientUuid || '',
    };

    logCurlRequest(healthInfoUrl, {
      method: 'GET',
      headers,
    });

    const response = await fetch(healthInfoUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar beneficiário por CPF: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.beneficiary;
  }
}

