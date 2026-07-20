import { useState } from 'react';
import { createRoom } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [game, setGame] = useState('unstable-unicorns');

  async function handleCreateRoom() {
    try {
      const room = await createRoom(playerName, game);

      navigate('/lobby', {
        state: {
          room,
          playerName,
        },
      });
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
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <br />
      <br />
      <button onClick={handleCreateRoom}>Crear Sala</button>
    </div>
  );
}
