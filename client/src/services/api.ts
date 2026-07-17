const API_URL = 'http://localhost:3000';

export async function createRoom(playerName: string, game: string) {
  const response = await fetch(`${API_URL}/rooms/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerName, game }),
  });

  if (!response.ok) throw new Error('no fue posible crear la sala.');

  return await response.json();
}
