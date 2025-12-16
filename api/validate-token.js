export default async function handler(req, res) {
  console.log('[API DEBUG] validate-token handler called');
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
    const { token, beneficiaryUuid, clientUuid } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        status: '400', 
        error: 'token é obrigatório na query string' 
      });
    }

    if (!beneficiaryUuid || typeof beneficiaryUuid !== 'string') {
      return res.status(400).json({ 
        status: '400', 
        error: 'beneficiaryUuid é obrigatório na query string' 
      });
    }

    if (!clientUuid || typeof clientUuid !== 'string') {
      return res.status(400).json({ 
        status: '400', 
        error: 'clientUuid é obrigatório na query string' 
      });
    }

    const { RPDADMIN_TOKEN, TEMA_URL, RPD_CLIENTID } = process.env;

    if (!RPDADMIN_TOKEN) {
      return res.status(500).json({ 
        status: '500', 
        error: 'Token da API é obrigatório. Configure RPDADMIN_TOKEN no .env.' 
      });
    }

    if (!TEMA_URL) {
      return res.status(500).json({ 
        status: '500', 
        error: 'URL da API TEMA é obrigatória. Configure TEMA_URL no .env.' 
      });
    }

    if (!RPD_CLIENTID) {
      return res.status(500).json({ 
        status: '500', 
        error: 'clientUuid é obrigatório. Configure RPD_CLIENTID no .env.' 
      });
    }

    // Validar formato do UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(beneficiaryUuid)) {
      return res.status(400).json({ 
        status: '400', 
        error: 'beneficiaryUuid deve estar no formato UUID válido' 
      });
    }

    // Garantir que TEMA_URL tenha protocolo e barra final
    let baseUrl = TEMA_URL.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.endsWith('/')) {
      baseUrl = `${baseUrl}/`;
    }

    const validateUrl = `${baseUrl}beneficiary-scans/validate-vitalscan?beneficiaryUuid=${beneficiaryUuid}&clientUuid=${clientUuid}`;

    // Validar se a URL é válida
    try {
      new URL(validateUrl);
    } catch (urlError) {
      return res.status(500).json({
        status: '500',
        error: `URL inválida construída: ${validateUrl}. Erro: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`
      });
    }

    const headers = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'clientId': RPD_CLIENTID,
      'consumes': 'application/json',
      'content-type': 'application/vnd.rapidoc.tema-v2+json',
      'produces': 'application/json',
      'token': token,
    };

    console.log('[API DEBUG] Calling validate URL:', validateUrl);

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

      return res.status(response.status).json({
        status: String(response.status),
        error: `Erro ao validar token Rapidoc: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      });
    }

    const data = await response.json();
    console.log('[API DEBUG] Token validated successfully');
    return res.json(data);
  } catch (error) {
    console.error('[API DEBUG] Error in validate-token handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      status: '500', 
      error: message 
    });
  }
}

