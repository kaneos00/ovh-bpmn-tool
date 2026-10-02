import { HttpError } from './httpError';

export type CreateApiClientOptions = {
  baseUrl: string;
};

export type ApiClient = {
  call: (url: string | URL, options?: RequestInit) => Promise<any>;
  get: (url: string | URL, options?: RequestInit) => Promise<any>;
  post: (url: string | URL, data: any, options?: RequestInit) => Promise<any>;
  put: (url: string | URL, data: any, options?: RequestInit) => Promise<any>;
  remove: (url: string | URL, options?: RequestInit) => Promise<any>;
};

const AUTH_TOKEN_STORAGE_KEY = 'bpmn-tool.auth-token';

export const getAuthToken = () => {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

export const createApiClient = ({
  baseUrl,
}: CreateApiClientOptions): ApiClient => {
  const addUrlPrefix = (url: string) => {
    return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  };

  const call = async (url: string | URL, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers = new Headers(options.headers);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if ('body' in options && options.body !== undefined) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(
      url instanceof URL ? url.toString() : addUrlPrefix(url),
      {
        ...options,
        headers,
      },
    );

    if (response.status === 401 && !String(url).includes('/auth/login')) {
      clearAuthToken();
    }

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new HttpError(response.status, response.statusText, errorResponse);
    }

    // ANCIEN CODE — conservé pour comparaison / retour arrière.
    // const contentLength = response.headers.get('Content-length');
    // if (contentLength && parseInt(contentLength, 10) > 0) {
    //   const responseBody = await response.text();
    //   try {
    //     return JSON.parse(responseBody);
    //   } catch (error) {
    //     return responseBody;
    //   }
    // }
    // return {};

    const responseBody = await response.text();

    if (!responseBody) {
      return {};
    }

    try {
      return JSON.parse(responseBody);
    } catch (error) {
      return responseBody;
    }
  };

  const get = async (url: string | URL, options: RequestInit = {}) => {
    return await call(url, options);
  };

  const post = async (
    url: string | URL,
    data: any,
    options: RequestInit = {},
  ) => {
    return await call(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const put = async (
    url: string | URL,
    data: any,
    options: RequestInit = {},
  ) => {
    return await call(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  const remove = async (url: string | URL, options: RequestInit = {}) => {
    return await call(url, {
      ...options,
      method: 'DELETE',
    });
  };

  return {
    call,
    get,
    post,
    put,
    remove,
  };
};
