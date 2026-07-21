import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { Player } from '../types/Room';
import { useNavigate } from 'react-router-dom';

interface Player {
  id: string;
  name: string;
}

interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
}

export default function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(location.state?.room ?? null);

  useEffect(() => {
    if (!room) return;

    socket.emit('join-room', {
      roomCode: room.code,
      playerName: location.state.playerName,
    });
    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });
    socket.on('game-started', (gameState) => {
      navigate('/game', {
        state: {
          gameState,
        },
      });
    });

    return () => {
      socket.off('room-updated');
      socket.off('game-started');
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
        {room.players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>
      <button
        onClick={() => {
          socket.emit('start-game', room.code);
        }}
      >
        Iniciar partida
      </button>
    </div>
  );
}
