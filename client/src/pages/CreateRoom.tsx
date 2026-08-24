import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { createRoom } from '../services/api';
import { saveSession } from '../services/session';
import { useGame } from '../context/useGame';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AvatarPicker from '../components/ui/AvatarPicker';
import { ArrowLeft } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { activate } = useGame();
  const [hostName, setHostName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!hostName.trim()) {
      setError('Por favor, ingresa tu nombre.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (!socket.id) {
        setError('Conectando con el servidor, intenta de nuevo en un momento.');
        setLoading(false);
        return;
      }

      const response = await createRoom({
        hostName: hostName.trim(),
        socketId: socket.id,
        avatar,
      });
      const { room, playerId, sessionToken } = response;

      if (!playerId || !sessionToken) {
        setError('El servidor no devolvió una sesión válida.');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando la sala');
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
              placeholder="Ej: Panda"
              maxLength={15}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 transition-all text-sm"
            />
          </div>

          <AvatarPicker value={avatar} onChange={setAvatar} accent="emerald" />

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3.5">
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
              Configuración de la sala
            </p>
            <p className="text-sm text-slate-400 mt-1">
              El juego y sus expansiones se elegirán en el lobby después de crear la sala.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {error}
            </p>
          )}

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
