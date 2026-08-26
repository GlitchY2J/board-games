import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { joinRoom, getRoomInfo } from '../services/api';
import { saveSession } from '../services/session';
import { useGame } from '../context/useGame';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AvatarPicker from '../components/ui/AvatarPicker';
import { ArrowLeft } from 'lucide-react';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { activate } = useGame();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [takenAvatars, setTakenAvatars] = useState<string[]>([]);

  useEffect(() => {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 2) {
      return;
    }

    let isMounted = true;
    const fetchTaken = async () => {
      try {
        const info = await getRoomInfo(code);
        if (isMounted && info?.takenAvatars) {
          setTakenAvatars(info.takenAvatars);
          if (info.takenAvatars.includes(avatar)) {
            setAvatar('');
          }
        }
      } catch {
        if (isMounted) {
          setTakenAvatars([]);
        }
      }
    };

    const timer = setTimeout(fetchTaken, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [roomCode, avatar]);

  async function handleJoin() {
    if (!roomCode.trim()) {
      alert('Por favor, ingresa el código de la sala.');
      return;
    }
    if (!playerName.trim()) {
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

      const response = await joinRoom({
        roomCode: roomCode.trim().toUpperCase(),
        playerName: playerName.trim(),
        socketId: socket.id,
        avatar,
      });

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
        isHost: false,
        playerName: playerName.trim(),
      });

      navigate('/lobby', {
        state: {
          room,
          playerName: playerName.trim(),
          playerId,
          isHost: false,
        },
      });
    } catch {
      alert('No fue posible unirse a la sala. Verifica el código.');
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="page-scroll min-h-screen w-full flex items-center justify-center p-6 relative">
      {/* Luces decorativas */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="text-center mt-6 mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Unirse a Sala
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Introduce el código de la sala de tu amigo
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Código de Sala
            </label>
            <input
              type="text"
              placeholder="Ej: AB12"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all text-center text-lg font-bold tracking-widest uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Ej: Raccoon"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all text-sm"
            />
          </div>

          <AvatarPicker
            value={avatar}
            onChange={setAvatar}
            accent="cyan"
            takenAvatars={takenAvatars}
          />

          <Button
            onClick={handleJoin}
            fullWidth
            disabled={loading}
            className="mt-2"
          >
            {loading ? 'Uniéndose...' : 'Unirse a Sala'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
