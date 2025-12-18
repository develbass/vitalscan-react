export default async function handler(req: any, res: any) {
  console.log('[API DEBUG] beneficiary-health handler called');
  console.log('[API DEBUG] Method:', req.method);
  console.log('[API DEBUG] URL:', req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[API DEBUG] OPTIONS request, returning 200');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: '405',
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const { beneficiaryUuid, clientUuid } = req.query;

    if (!beneficiaryUuid || typeof beneficiaryUuid !== 'string') {
      return res.status(400).json({
        status: '400',
        error: 'beneficiaryUuid é obrigatório na query string',
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(beneficiaryUuid)) {
      return res.status(400).json({
        status: '400',
        error: 'beneficiaryUuid deve estar no formato UUID válido',
      });
    }

    // Validação de variáveis de ambiente
    const API_URL = process.env.RPD_API_URL;
    console.log('API_URL', API_URL);
    const RPDADMIN_TOKEN = process.env.RPDADMIN_TOKEN;
    const RPD_CLIENTID = process.env.RPD_CLIENTID || clientUuid;

    if (!API_URL) {
      throw new Error('URL da API Rapidoc é obrigatória. Configure API_URL no .env.');
    }

    if (!RPDADMIN_TOKEN) {
      throw new Error('Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.');
    }

    if (!RPD_CLIENTID) {
      throw new Error('clientUuid é obrigatório. Configure RPD_CLIENTID no .env ou passe como parâmetro.');
    }

    const urlClientUuid = typeof clientUuid === 'string' ? clientUuid : RPD_CLIENTID;
    
    // Construir URL usando API WHATWG URL (moderna e segura)
    let baseUrl = API_URL.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    let requestUrl;
    try {
      const urlObj = new URL('v1/beneficiary-health-informations', baseUrl);
      urlObj.searchParams.set('beneficiaryUuid', beneficiaryUuid);
      urlObj.searchParams.set('clientUuid', urlClientUuid);
      requestUrl = urlObj.toString();
    } catch (urlError) {
      throw new Error(`Erro ao construir URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
    }

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'clientId': RPD_CLIENTID,
    };

    console.log('[API DEBUG] Fetching health data from:', requestUrl);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers,
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
        `Erro ao buscar informações de saúde: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      );
    }

    const rawHealthData = await response.json();

    // Funções de normalização inline
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
    let healthData;
    if (Array.isArray(rawHealthData) && rawHealthData.length > 0) {
      healthData = normalizeRecord(rawHealthData[0]);
    } else {
      healthData = normalizeRecord(rawHealthData);
    }

    return res.json(healthData);
  } catch (error) {
    console.error('[API DEBUG] Error in beneficiary-health handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      status: '500',
      error: message,
    });
  }
}

