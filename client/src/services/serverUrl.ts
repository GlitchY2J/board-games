const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();

export const SERVER_URL = configuredUrl
  ? configuredUrl.replace(/\/$/, '')
  : typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000';
