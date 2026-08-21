const API = 'http://10.30.11.88:3000';

// Crear sala
export async function createRoom(data: {
  hostName: string;
  game: string;
  socketId: string;
  avatar: string;
}) {
  const response = await fetch(`${API}/rooms/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error creando sala');
  }

  return response.json();
}

// Unirse a salad
export async function joinRoom(data: {
  roomCode: string;
  playerName: string;
  socketId: string;
  avatar: string;
}) {
  const response = await fetch(`${API}/rooms/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al unirse a la sala');
  }

  return response.json();
}

// Obtener info de sala (para avatares ocupados, etc.)
export async function getRoomInfo(roomCode: string) {
  const response = await fetch(`${API}/rooms/${roomCode.toUpperCase()}`);

  if (!response.ok) {
    throw new Error('Sala no encontrada');
  }

  return response.json();
}
