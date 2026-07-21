import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
interface Player {
  id: string;
  socketId: string;
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
  const playerName = location.state?.playerName;
  const isHost = location.state?.isHost;

  useEffect(() => {
    if (!room) return;

    socket.emit('join-room', {
      roomCode: room.code,
      playerName,
    });

    // solo invitados
    if (!isHost) {
      socket.emit('join-room', {
        roomCode: room.code,
        playerName,
      });
    }

    const onRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const onGameStarted = (gameState: any) => {
      navigate('/game', {
        state: {
          gameState,
        },
      });
    };

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-started', onGameStarted);

    return () => {
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-started', onGameStarted);
    };
  }, [room, isHost, navigate, playerName]);

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
          <li key={player.id}>
            {player.name} {player.id === room.hostId && ' 👑'}
          </li>
        ))}
      </ul>
      {isHost && (
        <button
          onClick={() => {
            socket.emit('start-game', room.code);
          }}
        >
          Iniciar partida
        </button>
      )}
    </div>
  );
}
