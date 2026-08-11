import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { createRoom } from '../services/api';
import { saveSession } from '../services/session';
import { useGame } from '../context/GameContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { activate } = useGame();
  const [hostName, setHostName] = useState('');
  const [game] = useState('unstable-unicorns');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!hostName.trim()) {
      alert('Por favor, ingresa tu nombre.');
      return;
    }

    setLoading(true);
    try {
      if (!socket.id) {
        alert('Conectando con el servidor, intenta de nuevo en un momento.');
        setLoading(false);
        return;
      }

      const response = await createRoom({ hostName: hostName.trim(), game, socketId: socket.id });
      const { room, playerId, sessionToken } = response;

      if (!playerId || !sessionToken) {
        alert('El servidor no devolvió una sesión válida.');
        setLoading(false);
        return;
      }

      saveSession({ roomCode: room.code, playerId, sessionToken });

      activate({
        room,
        playerId,
        isHost: true,
        playerName: hostName.trim(),
      });

      navigate('/lobby', {
        state: {
          room,
          playerName: hostName.trim(),
          playerId,
          isHost: true,
        },
      });
    } catch {
      alert('Error creando la sala');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Luces decorativas */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="text-center mt-6 mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Crear Sala</h2>
          <p className="text-slate-400 text-sm mt-2">
            Configura tu sala de juego en segundos
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tu Nombre
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Ej: Alejandro"
              maxLength={15}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Juego Seleccionado
            </label>
            <div className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/20 border border-slate-800/40 text-slate-400 text-sm select-none flex items-center justify-between">
              <span>Unstable Unicorns (Base)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                Activo
              </span>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            fullWidth
            disabled={loading}
            className="mt-2"
          >
            {loading ? 'Creando sala...' : 'Crear Sala'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
