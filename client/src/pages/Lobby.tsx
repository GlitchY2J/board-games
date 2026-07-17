import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { room } = useGame();

  if (!room) return <h1>No hay sala cargada.</h1>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Lobby</h1>
      <h2>Código:</h2>
      <p>{room.code}</p>
      <h2>Juego:</h2>
      <p>{room.game}</p>
      <h2>Jugadores:</h2>
      <ul>
        {room.players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>
    </div>
  );
}
