let cachedToken: string | null = null;
const REFRESH_SESSION_KEY = 'surtitelas.refresh-session';

export const tokenStorage = {
  getAccessToken(): string | null {
    return cachedToken;
  },
  getRefreshToken(): string | null {
    return null;
  },
  hasRefreshSession(): boolean {
    return typeof localStorage !== 'undefined' && localStorage.getItem(REFRESH_SESSION_KEY) === '1';
  },
  markRefreshSession(): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(REFRESH_SESSION_KEY, '1');
  },
  setTokens(accessToken: string, _refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.markRefreshSession();
  },
  setAccessToken(accessToken: string): void {
    cachedToken = accessToken;
  },
  clear(): void {
    cachedToken = null;
    if (typeof localStorage !== 'undefined') localStorage.removeItem(REFRESH_SESSION_KEY);
  },
};
