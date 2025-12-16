export default async function handler(req: any, res: any) {
  console.log('[API DEBUG] health-informations handler called');
  console.log('[API DEBUG] Method:', req.method);
  console.log('[API DEBUG] URL:', req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[API DEBUG] OPTIONS request, returning 200');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: '405',
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const {
      beneficiaryUuid,
      clientUuid,
      height,
      weight,
      smoke,
      medicationHypertension,
      gender,
      diabetes,
    } = req.body;

    if (!beneficiaryUuid) {
      return res.status(400).json({
        status: '400',
        error: 'beneficiaryUuid é obrigatório no corpo da requisição',
      });
    }

    if (typeof height !== 'number' || typeof weight !== 'number') {
      return res.status(400).json({
        status: '400',
        error: 'height e weight numéricos são obrigatórios no corpo da requisição',
      });
    }

    // Validação de variáveis de ambiente
    const API_URL = process.env.API_URL;
    const RPDADMIN_TOKEN = process.env.RPDADMIN_TOKEN;
    const RPD_CLIENTID = process.env.RPD_CLIENTID;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    if (!RPD_CLIENTID) {
      throw new Error('clientUuid é obrigatório. Configure RPD_CLIENTID no .env.');
    }

    // Validações adicionais
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(beneficiaryUuid)) {
      return res.status(400).json({
        status: '400',
        error: 'beneficiaryUuid deve estar no formato UUID válido',
      });
    }

    if (!gender || diabetes === undefined || diabetes === null) {
      return res.status(400).json({
        status: '400',
        error: 'gender e diabetes são obrigatórios',
      });
    }

    // Validar números
    const heightNum = Number(height);
    const weightNum = Number(weight);

    if (isNaN(heightNum) || isNaN(weightNum)) {
      return res.status(400).json({
        status: '400',
        error: 'height e weight devem ser números válidos',
      });
    }

    if (heightNum < 50 || heightNum > 250) {
      return res.status(400).json({
        status: '400',
        error: 'height deve estar entre 50 e 250 cm',
      });
    }

    if (weightNum < 20 || weightNum > 300) {
      return res.status(400).json({
        status: '400',
        error: 'weight deve estar entre 20 e 300 kg',
      });
    }

    // Funções de normalização inline
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

    const urlClientUuid = clientUuid || RPD_CLIENTID;
    const payload = {
      beneficiary: {
        uuid: beneficiaryUuid,
      },
      height: heightNum,
      weight: weightNum,
      smoke: normalizeSmoke(smoke ?? ''),
      medicationHypertension: normalizeMedicationHypertension(medicationHypertension ?? ''),
      gender: normalizeGender(gender),
      diabetes: normalizeDiabetes(diabetes),
    };

    // Garantir que API_URL tenha protocolo e barra final
    let baseUrl = API_URL.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.endsWith('/')) {
      baseUrl = `${baseUrl}/`;
    }
    
    const apiUrl = `${baseUrl}v1/beneficiary-health-informations`;
    const finalUrl = `${apiUrl}?clientUuid=${urlClientUuid}`;

    // Validar se a URL é válida
    try {
      new URL(finalUrl);
    } catch (urlError) {
      throw new Error(`URL inválida construída: ${finalUrl}. Erro: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
    }

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': RPD_CLIENTID,
    };

    console.log('[API DEBUG] Saving health data to:', finalUrl);

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('[API DEBUG] Resposta de erro da API externa:', errorBody);
      } catch (e) {
        console.error('[API DEBUG] Não foi possível ler o corpo da resposta de erro');
      }

      throw new Error(
        `Erro ao salvar informações de saúde na API externa: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      );
    }

    const result = await response.json();
    return res.json(result);
  } catch (error) {
    console.error('[API DEBUG] Error in health-informations handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      status: '500',
      error: message,
    });
  }
}

