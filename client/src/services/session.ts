const SESSION_KEY = 'board-games-session';

export interface StoredSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): StoredSession | null {
  const stored = localStorage.getItem(SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredSession;
  } catch {
    clearSession();

    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
