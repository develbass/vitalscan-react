import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import { join } from 'path';
import { fileURLToPath } from 'url';
import client, { enums } from '@nuralogix.ai/dfx-api-client';
import connectLivereload from 'connect-livereload';
import LiveReload from './livereload.ts';
import { RapidocApiClient } from '../../client/utils/rapidocApiClient.ts';
import type { HealthInformationsPayload } from '../../client/utils/rapidocApiClient.ts';

const { DeviceTypeID } = enums;
const distPath = fileURLToPath(new URL('../../dist/', import.meta.url));
const { API_URL, LICENSE_KEY, STUDY_ID, RPDADMIN_TOKEN, TEMA_URL, RPD_CLIENTID } = process.env;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default class Server {
  app: Application;
  appPath = distPath;
  port: number;
  apiUrl = requireEnv('API_URL', API_URL);
  studyId = requireEnv('STUDY_ID', STUDY_ID);
  licenseKey = requireEnv('LICENSE_KEY', LICENSE_KEY);
  apiClient = client({
    url: {
      http: new URL(`https://${this.apiUrl}`),
      wss: new URL(`wss://${this.apiUrl}`),
    },
  });
  rapidocApiClient = new RapidocApiClient({
    environments: {
      API_URL,
      RPDADMIN_TOKEN,
      TEMA_URL,
      RPD_CLIENTID,
    },
  });

  constructor(port: string) {
    this.app = express();
    this.port = Number.parseInt(port, 10);
    if (Number.isNaN(this.port)) {
      throw new Error(`Invalid port: ${port}`);
    }

    if (NODE_ENV === 'development') this.initLiveReload();
    this.middlewares();
    this.routes();
  }

  initLiveReload() {
    const liveReload = new LiveReload(join(this.appPath, '.build-done'));
    liveReload.init();
    this.app.use(connectLivereload());
  }

  middlewares() {
    this.app.use(cors({ credentials: true, origin: '*' }));
    if (NODE_ENV === 'production') {
      this.app.use(compression() as unknown as express.RequestHandler);
    }
  }

  routes() {
    this.app.use(express.json());

    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    this.app.get('/api/studyId', (_req: Request, res: Response) => {
      res.status(200).json({
        status: '200',
        studyId: this.studyId,
      });
    });

    this.app.get('/api/token', async (_req: Request, res: Response) => {
      try {
        const tokenExpiresIn = 60 * 60; // 1 hour
        const payload = {
          Key: this.licenseKey,
          DeviceTypeID: DeviceTypeID.WIN32,
          Name: 'Anura Web Core SDK',
          Identifier: 'ANURA_WEB_CORE_SDK',
          Version: '0.1.0-beta.2',
          TokenExpiresIn: tokenExpiresIn,
        };
        const registerLicense = await this.apiClient.http.organizations.registerLicense(
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
        const message = error instanceof Error ? error.message : error;
        res.status(500).json({ status: '500', error: message });
      }
    });

    this.app.get('/api/beneficiary-health', async (req: Request, res: Response) => {
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

        const healthData = await this.rapidocApiClient.fetchBeneficiaryHealthInformations(
          beneficiaryUuid,
          typeof clientUuid === 'string' ? clientUuid : undefined
        );

        return res.json(healthData);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Erro ao buscar informações de saúde do beneficiário:', error);
        return res.status(500).json({
          status: '500',
          error: message,
        });
      }
    });

    this.app.post('/api/health-informations', async (req: Request, res: Response) => {
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
        } = req.body as {
          beneficiaryUuid?: string;
          clientUuid?: string;
          height?: number;
          weight?: number;
          smoke?: boolean | string;
          medicationHypertension?: boolean | string;
          gender?: string;
          diabetes?: string;
        };

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

        const payload: HealthInformationsPayload = {
          beneficiary: {
            uuid: beneficiaryUuid,
          },
          height,
          weight,
          smoke: smoke as boolean | string,
          medicationHypertension: medicationHypertension as boolean | string,
          gender: gender ?? '',
          diabetes: diabetes ?? '',
        };

        const result = await this.rapidocApiClient.saveHealthInformations(payload, clientUuid);

        return res.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Erro ao salvar informações de saúde na Rapidoc:', error);
        return res.status(500).json({
          status: '500',
          error: message,
        });
      }
    });

    this.app.get('/api/validate-token', async (req: Request, res: Response) => {
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

        const validateUrl = `${TEMA_URL}beneficiary-scans/validate-vitalscan?beneficiaryUuid=${beneficiaryUuid}&clientUuid=${clientUuid}`;

        const headers = {
          'Authorization': `Bearer ${RPDADMIN_TOKEN}`,
          'clientId': RPD_CLIENTID,
          'consumes': 'application/json',
          'content-type': 'application/vnd.rapidoc.tema-v2+json',
          'produces': 'application/json',
          'token': token,
        };

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
        res.json(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Erro ao validar token:', error);
        res.status(500).json({ status: '500', error: message });
      }
    });

    this.app.use('/', express.static(this.appPath));
    this.app.use('/', express.static(join(this.appPath, 'wmea')));
    this.app.get('/*name', (_req: Request, res: Response) => {
      res.sendFile(join(this.appPath, 'index.html'), (err: Error | null) => {
        if (err) res.status(500).send(err);
      });
    });
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`${NODE_ENV} server is running on port:`, this.port);
    });
  }
}
