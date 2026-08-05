import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { createRoom } from '../services/api';

export default function CreateRoom() {
  const navigate = useNavigate();

  const [hostName, setHostName] = useState('');
  const [game] = useState('unstable-unicorns');

  async function handleCreate() {
    try {
      const room = await createRoom({
        hostName,
        game,
        socketId: socket.id!,
      });

      navigate('/lobby', {
        state: {
          room,
          playerName: hostName,
          isHost: true,
        },
      });
    } catch {
      alert('Error creando la sala');
    }
  }

  return (
    <div>
      <input
        value={hostName}
        onChange={(e) => setHostName(e.target.value)}
        placeholder="Nombre"
      />
      <button onClick={handleCreate}>Crear Sala</button>
    </div>
  );
}
