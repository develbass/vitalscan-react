import client, { enums } from '@nuralogix.ai/dfx-api-client';

const { DeviceTypeID } = enums;

export default async function handler(req, res) {
  console.log('[API DEBUG] token handler called');
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

  function requireEnv(name, value) {
    if (!value) {
      console.error(`[API DEBUG] Missing environment variable: ${name}`);
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.log(`[API DEBUG] Environment variable ${name} found: ${value ? 'YES (value hidden for security)' : 'NO'}`);
    return value;
  }

  try {
    console.log('[API DEBUG] Checking environment variables...');
    console.log('[API DEBUG] process.env keys:', Object.keys(process.env).filter(k => k.includes('STUDY') || k.includes('API') || k.includes('LICENSE')));
    console.log('[API DEBUG] API_URL exists:', !!process.env.API_URL);
    console.log('[API DEBUG] LICENSE_KEY exists:', !!process.env.LICENSE_KEY);
    
    const apiUrl = requireEnv('API_URL', process.env.API_URL);
    const licenseKey = requireEnv('LICENSE_KEY', process.env.LICENSE_KEY);
    
    console.log('[API DEBUG] API_URL:', apiUrl);

    const apiClient = client({
      url: {
        http: new URL(`https://${apiUrl}`),
        wss: new URL(`wss://${apiUrl}`),
      },
    });

    const tokenExpiresIn = 60 * 60; // 1 hour
    const payload = {
      Key: licenseKey,
      DeviceTypeID: DeviceTypeID.WIN32,
      Name: 'Anura Web Core SDK',
      Identifier: 'ANURA_WEB_CORE_SDK',
      Version: '0.1.0-beta.2',
      TokenExpiresIn: tokenExpiresIn,
    };

    console.log('[API DEBUG] Calling registerLicense...');
    const registerLicense = await apiClient.http.organizations.registerLicense(
      payload,
      false
    );
    const { status, body } = registerLicense;
    console.log('[API DEBUG] registerLicense status:', status);
    console.log('[API DEBUG] registerLicense body:', body);

    // Validar se status é válido
    if (!status) {
      console.error('[API DEBUG] registerLicense returned null/undefined status');
      return res.status(500).json({ 
        status: '500', 
        error: 'Erro ao obter token: status inválido da API' 
      });
    }

    if (status === '200') {
      const { Token, RefreshToken } = body;
      console.log('[API DEBUG] Token received successfully');
      return res.json({ status, token: Token, refreshToken: RefreshToken });
    } else {
      console.error('[API DEBUG] registerLicense failed with status:', status);
      console.error('[API DEBUG] Error body:', body);
      // Garantir que o status code seja um número válido
      const statusCode = Number.parseInt(String(status), 10);
      if (isNaN(statusCode) || statusCode < 100 || statusCode >= 600) {
        // Se não conseguir converter para um status code válido, usar 500
        return res.status(500).json({ 
          status: '500', 
          error: body || 'Erro desconhecido ao obter token' 
        });
      }
      return res.status(statusCode).json({ status, error: body });
    }
  } catch (error) {
    console.error('[API DEBUG] Error in token handler:', error);
    console.error('[API DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: '500', 
      error: message 
    });
  }
}
