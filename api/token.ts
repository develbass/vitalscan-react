import client, { enums } from '@nuralogix.ai/dfx-api-client';

interface VercelRequest {
  method?: string;
  body?: any;
  query?: { [key: string]: string | string[] | undefined };
  headers?: { [key: string]: string | string[] | undefined };
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
}

const { DeviceTypeID } = enums;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiUrl = requireEnv('API_URL', process.env.API_URL);
    const licenseKey = requireEnv('LICENSE_KEY', process.env.LICENSE_KEY);

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

    const registerLicense = await apiClient.http.organizations.registerLicense(
      payload,
      false
    );
    const { status, body } = registerLicense;

    if (status === '200') {
      const { Token, RefreshToken } = body;
      res.json({ status, token: Token, refreshToken: RefreshToken });
    } else {
      res.status(Number.parseInt(status, 10)).json({ status, error: body });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: '500', 
      error: message 
    });
  }
}
