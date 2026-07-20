import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { Player } from '../types/Room';
import { useNavigate } from 'react-router-dom';

export default function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState(location.state?.room);

  useEffect(() => {
    if (!room) return;

    socket.emit('join-room', {
      roomCode: room.code,
      playerName: location.state.playerName,
    });
    socket.on('room-updated', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off('room-updated');
    };
  }, []);

  if (!room) {
    return <h2>Cargando lobby...</h2>;
  }

  return (
    <div>
      <h1>Lobby</h1>
      <h2>Código: {room.code}</h2>
      <h3>Juego: {room.game}</h3>
      <h3>Jugadores</h3>
      <ul>
        {room.players.map((player: Player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>
      <button onClick={() => navigate('/game')}>Iniciar partida</button>
    </div>
  );
}
