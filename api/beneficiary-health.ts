import { RapidocApiClient } from '../client/utils/rapidocApiClient';

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

    const rapidocApiClient = new RapidocApiClient({
      environments: {
        API_URL: process.env.API_URL,
        RPDADMIN_TOKEN: process.env.RPDADMIN_TOKEN,
        TEMA_URL: process.env.TEMA_URL,
        RPD_CLIENTID: process.env.RPD_CLIENTID,
      },
    });

    const healthData = await rapidocApiClient.fetchBeneficiaryHealthInformations(
      beneficiaryUuid,
      typeof clientUuid === 'string' ? clientUuid : undefined
    );

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

