const REFRESH_TOKEN_KEY = "carepaws_refresh_token";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  else sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
