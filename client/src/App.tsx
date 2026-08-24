import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import Lobby from './pages/Lobby';
import StartingGame from './pages/StartingGame';
import Game from './pages/Game';
import Settings from './pages/Settings';
import { useEffect } from 'react';
import JoinRoom from './pages/JoinRoom';
import { CardPreviewProvider } from './context/CardPreviewContext';
import { useGame } from './context/useGame';
import CardPreview from './components/card/CardPreview';
import GameErrorToast from './components/game/GameErrorToast';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { status, room, gameState } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === 'loading') return;

    const path = location.pathname;

    if (status === 'none') {
      if (path === '/game' || path === '/lobby' || path === '/starting') {
        navigate('/', { replace: true });
      }
      return;
    }

    if (gameState?.started) {
      if (path !== '/game' && path !== '/starting' && path !== '/lobby') {
        navigate('/game', { replace: true });
      }
    } else if (room) {
      if (path !== '/lobby' && path !== '/starting' && path !== '/game') {
        navigate('/lobby', { replace: true });
      }
    } else if (path === '/game' || path === '/lobby' || path === '/starting') {
      navigate('/', { replace: true });
    }
  }, [status, gameState, room, location.pathname, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-emerald-400" size={40} />
        <p className="text-sm text-slate-400 font-medium">
          Recuperando sesión...
        </p>
      </div>
    );
  }

  return (
    <CardPreviewProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/starting" element={<StartingGame />} />
          <Route path="/game" element={<Game />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <CardPreview />
      <GameErrorToast />
    </CardPreviewProvider>
  );
}
