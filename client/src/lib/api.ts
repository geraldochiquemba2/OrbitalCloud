const AUTH_TOKEN_KEY = 'angocloud_auth_token';

function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {};
  
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export function getAuthHeaders(includeContentType: boolean = true): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export function getAuthToken(): string | null {
  return getStoredToken();
}
