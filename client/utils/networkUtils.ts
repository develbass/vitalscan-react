/**
 * Utilitários para requisições de rede
 */

/**
 * Interface para substituir o AxiosRequestConfig e adaptar para uso com fetch
 */
export interface FetchRequestConfig {
  method?: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, string>;
}

/**
 * Gera e imprime um comando curl equivalente à requisição fetch informada
 * @param url - URL da requisição
 * @param options - Opções da requisição (método, headers, body, etc)
 */
export const logCurlRequest = (url: string, options?: RequestInit): void => {
  // Inicializa o comando curl com a URL
  let curlCommand = `curl -X ${options?.method || 'GET'} '${url}'`;

  // Adiciona os headers ao comando
  if (options?.headers) {
    const headers = options.headers as Record<string, string>;
    Object.entries(headers).forEach(([key, value]) => {
      curlCommand += ` -H '${key}: ${value}'`;
    });
  }

  // Adiciona o body se existir
  if (options?.body) {
    let bodyStr = '';
    
    // Verifica se o body é uma string ou precisa ser convertido
    if (typeof options.body === 'string') {
      bodyStr = options.body;
    } else if (options.body instanceof FormData) {
      bodyStr = '[FormData não pode ser representado diretamente no curl]';
    } else {
      try {
        bodyStr = JSON.stringify(options.body);
      } catch (error) {
        bodyStr = '[Erro ao converter body para string]';
      }
    }
    
    // Adiciona o body ao comando
    if (bodyStr) {
      curlCommand += ` -d '${bodyStr}'`;
    }
  }

  // Imprime o comando no console
  console.log('Curl equivalente:');
  console.log(curlCommand);
};

/**
 * Gera e imprime um comando curl equivalente à requisição
 * @param url - URL da requisição
 * @param config - Configuração da requisição (compatível com a antiga interface do axios)
 */
export const logRequestAsCurl = (url: string, config: FetchRequestConfig): void => {
  // Inicializa o comando curl com a URL
  const method = (config.method || 'get').toUpperCase();
  
  // Adiciona query params à URL se existirem
  let fullUrl = url;
  if (config.params) {
    const queryParams = new URLSearchParams();
    Object.entries(config.params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    fullUrl += `?${queryParams.toString()}`;
  }
  
  let curlCommand = `curl -X ${method} '${fullUrl}'`;

  // Adiciona os headers ao comando
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      curlCommand += ` -H '${key}: ${value}'`;
    });
  }

  // Adiciona o body se existir
  if (config.data) {
    let bodyStr = '';
    
    // Verifica se o body é uma string ou precisa ser convertido
    if (typeof config.data === 'string') {
      bodyStr = config.data;
    } else if (config.data instanceof FormData) {
      bodyStr = '[FormData não pode ser representado diretamente no curl]';
    } else {
      try {
        bodyStr = JSON.stringify(config.data);
      } catch (error) {
        bodyStr = '[Erro ao converter body para string]';
      }
    }
    
    // Adiciona o body ao comando
    if (bodyStr) {
      curlCommand += ` -d '${bodyStr}'`;
    }
  }

  // Imprime o comando no console
  console.log('Curl equivalente:');
  console.log(curlCommand);
};

// Alias para manter compatibilidade com código existente
export const logAxiosCurlRequest = logRequestAsCurl;

/**
 * Wrapper para fetch que também loga o comando curl equivalente
 * @param url - URL da requisição
 * @param options - Opções da requisição
 * @returns Promise com resposta do fetch
 */
export const fetchWithCurl = async (url: string, options?: RequestInit): Promise<Response> => {
  logCurlRequest(url, options);
  return fetch(url, options);
};

/**
 * Converte configuração no estilo axios para configuração fetch
 * @param config - Configuração no estilo axios
 * @returns Configuração para fetch
 */
export const convertToFetchOptions = (config: FetchRequestConfig): RequestInit => {
  const fetchOptions: RequestInit = {
    method: config.method?.toUpperCase() || 'GET',
    headers: config.headers || {},
  };

  if (config.data) {
    fetchOptions.body = typeof config.data === 'string' 
      ? config.data 
      : JSON.stringify(config.data);
  }

  return fetchOptions;
};

/**
 * Executa uma requisição usando fetch, com suporte para configuração no estilo axios
 * @param url - URL da requisição
 * @param config - Configuração da requisição (compatível com a antiga interface do axios)
 * @returns Promise com resposta do fetch
 */
export const requestWithCurl = async (url: string, config: FetchRequestConfig = {}): Promise<Response> => {
  // Formata a URL com query params se existirem
  let fullUrl = url;
  if (config.params) {
    const queryParams = new URLSearchParams();
    Object.entries(config.params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    fullUrl += `?${queryParams.toString()}`;
  }
  
  // Converte a configuração para o formato do fetch
  const fetchOptions = convertToFetchOptions(config);
  
  // Loga o comando curl e executa a requisição
  logRequestAsCurl(url, config);
  return fetch(fullUrl, fetchOptions);
}; 