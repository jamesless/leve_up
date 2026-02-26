const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type TRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: TRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = getAuthToken();

  const res = await fetch(`${BASE_URL}${url}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(headers as Record<string, string>),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const get = <T>(url: string, options?: TRequestOptions) =>
  request<T>(url, { ...options, method: 'GET' });

export const post = <T>(url: string, body?: unknown, options?: TRequestOptions) =>
  request<T>(url, { ...options, method: 'POST', body });

export const put = <T>(url: string, body?: unknown, options?: TRequestOptions) =>
  request<T>(url, { ...options, method: 'PUT', body });

export const del = <T>(url: string, options?: TRequestOptions) =>
  request<T>(url, { ...options, method: 'DELETE' });
