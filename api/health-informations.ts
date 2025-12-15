import { RapidocApiClient } from '../client/utils/rapidocApiClient';

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

    const rapidocApiClient = new RapidocApiClient({
      environments: {
        API_URL: process.env.API_URL,
        RPDADMIN_TOKEN: process.env.RPDADMIN_TOKEN,
        TEMA_URL: process.env.TEMA_URL,
        RPD_CLIENTID: process.env.RPD_CLIENTID,
      },
    });

    const payload = {
      beneficiary: {
        uuid: beneficiaryUuid,
      },
      height,
      weight,
      smoke: smoke ?? '',
      medicationHypertension: medicationHypertension ?? '',
      gender: gender ?? '',
      diabetes: diabetes ?? '',
    };

    const result = await rapidocApiClient.saveHealthInformations(payload, clientUuid);

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

