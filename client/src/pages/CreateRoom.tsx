import { useState } from 'react';
import { createRoom } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { setRoom, setPlayerName } = useGame();
  const [playerName, setPlayer] = useState('');

  async function handleCreate() {
    try {
      const room = await createRoom(playerName, 'Poker');
      setRoom(room);
      setPlayerName(playerName);
      navigate('/lobby');
    } catch (err) {
      console.error(err);
      alert('Error creando la sala.');
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Crear Sala</h1>
      <br />
      <input
        placeholder="Nombre"
        value={playerName}
        onChange={(e) => setPlayer(e.target.value)}
      />
      <br />
      <br />
      <button onClick={handleCreate}>Crear Sala</button>
    </div>
  );
}
