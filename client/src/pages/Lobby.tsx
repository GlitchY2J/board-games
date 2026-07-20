import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

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
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('game-started', (gameState) => {
      console.log(gameState);
    });
    return () => {
      socket.off('room-updated');
      socket.off('game-started');
    };
  }, []);

  function startGame() {
    if (!room) return;

    socket.emit('start-game', room.code);
  }
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
      <button onClick={startGame}>Iniciar Partida</button>
    </div>
  );
}
