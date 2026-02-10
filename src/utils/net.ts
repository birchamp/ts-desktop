import { getBridge, invoke } from './ipc';

export type HttpMethod = ElectronHttpMethod;
export type HttpRequest = ElectronNetworkRequest;
export type HttpResponse<T = unknown> = ElectronNetworkResponse<T>;

const BRIDGE_UNAVAILABLE: HttpResponse = {
  ok: false,
  status: 0,
  statusText: 'bridge-unavailable',
  headers: {},
  data: null,
  error: 'Electron network bridge unavailable',
};

export async function request<T = unknown>(payload: HttpRequest): Promise<HttpResponse<T>> {
  const bridge = getBridge();
  if (bridge?.net) {
    try {
      return await bridge.net.request<T>(payload);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        statusText: 'request-error',
        headers: {},
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  try {
    return await invoke<HttpResponse<T>>('net:request', payload);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'request-error',
      headers: {},
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function get<T = unknown>(url: string, options: Partial<HttpRequest> = {}): Promise<HttpResponse<T>> {
  return request<T>({
    url,
    method: 'GET',
    ...options,
  });
}

export async function post<T = unknown>(
  url: string,
  body?: HttpRequest['body'],
  options: Partial<HttpRequest> = {}
): Promise<HttpResponse<T>> {
  return request<T>({
    url,
    method: 'POST',
    body,
    ...options,
  });
}
