export default async function handler(req: any, res: any) {
  console.log('[API DEBUG] save-results handler called');
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
    const body = req.body as {
      beneficiary?: { uuid?: string };
      uuid?: string;
      clientUuid?: string;
      token?: string;
      [key: string]: any;
    };

    // Validações obrigatórias
    if (!body.beneficiary?.uuid) {
      return res.status(400).json({
        status: '400',
        error: 'beneficiary.uuid é obrigatório no corpo da requisição',
      });
    }

    if (!body.uuid) {
      return res.status(400).json({
        status: '400',
        error: 'uuid é obrigatório no corpo da requisição',
      });
    }

    // Validar formato dos UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.beneficiary.uuid)) {
      return res.status(400).json({
        status: '400',
        error: 'beneficiary.uuid deve estar no formato UUID válido',
      });
    }

    if (!uuidRegex.test(body.uuid)) {
      return res.status(400).json({
        status: '400',
        error: 'uuid deve estar no formato UUID válido',
      });
    }

    // Validar variáveis de ambiente
    const { RPDADMIN_TOKEN, TEMA_URL, RPD_CLIENTID } = process.env;

    if (!RPDADMIN_TOKEN) {
      return res.status(500).json({
        status: '500',
        error: 'Token da API Rapidoc é obrigatório. Configure RPDADMIN_TOKEN no .env.',
      });
    }

    if (!TEMA_URL) {
      return res.status(500).json({
        status: '500',
        error: 'URL da API Rapidoc é obrigatória. Configure TEMA_URL no .env.',
      });
    }

    if (!RPD_CLIENTID) {
      return res.status(500).json({
        status: '500',
        error: 'clientUuid é obrigatório. Configure RPD_CLIENTID no .env.',
      });
    }

    // Preparar dados para envio
    const beneficiary = {
      uuid: body.beneficiary.uuid,
    };

    // Extrair todos os campos do body exceto beneficiary, clientUuid e token para o resultsObj
    const { beneficiary: _, clientUuid, token, ...resultsObj } = body;
    resultsObj.uuid = body.uuid; // Garantir que uuid está no resultsObj

    // Garantir que TEMA_URL tenha protocolo e barra final
    let baseUrl = TEMA_URL.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.endsWith('/')) {
      baseUrl = `${baseUrl}/`;
    }

    const finalClientUuid = clientUuid || RPD_CLIENTID;
    const finalUrl = `${baseUrl}beneficiary-scans/${resultsObj.uuid}?clientUuid=${finalClientUuid}`;

    // Validar se a URL é válida
    try {
      new URL(finalUrl);
    } catch (urlError) {
      return res.status(500).json({
        status: '500',
        error: `URL inválida construída: ${finalUrl}. Erro: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`
      });
    }

    const payload = {
      ...resultsObj,
      beneficiary,
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json',
      'consumes': 'application/json',
      'clientId': finalClientUuid,
    };

    // Adicionar token se fornecido
    if (token) {
      headers['token'] = token;
    }

    console.log('[API DEBUG] Calling update URL:', finalUrl);

    const response = await fetch(finalUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.status !== 204) {
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('[API DEBUG] Resposta de erro da API externa:', errorBody);
      } catch (e) {
        console.error('[API DEBUG] Não foi possível ler o corpo da resposta de erro');
      }

      return res.status(response.status).json({
        status: String(response.status),
        error: `Erro ao atualizar resultado na API externa: ${response.status} ${response.statusText}. Detalhes: ${errorBody}`
      });
    }

    return res.status(200).json({
      status: '200',
      message: 'Resultados salvos com sucesso na Rapidoc',
    });
  } catch (error) {
    console.error('[API DEBUG] Error in save-results handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      status: '500',
      error: message,
    });
  }
}

