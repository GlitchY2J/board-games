import { use, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { joinRoom } from '../services/api';

export default function JoinRoom() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  async function handleJoin() {
    try {
      const room = await joinRoom({
        roomCode,
        playerName,
        socketId: socket.id!,
      });

      navigate('/lobby', {
        state: {
          room,
          playerName,
          isHost: false,
        },
      });
    } catch {
      alert('No fue posible unirse a la sala');
    }
  }

  return (
    <div>
      <input
        placeholder="Código"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
      />
      <input
        placeholder="Nombre"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button onClick={handleJoin}>Unirse</button>
    </div>
  );
}
