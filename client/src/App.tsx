import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Settings from './pages/Settings';
import { useEffect } from 'react';
import { socket } from './services/socket';
import JoinRoom from './pages/JoinRoom';
import { CardPreviewProvider } from './context/CardPreviewContext';
import CardPreview from './components/card/CardPreview';
import GameErrorToast from './components/game/GameErrorToast';

export default function App() {
  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <CardPreviewProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game" element={<Game />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <CardPreview />
      <GameErrorToast />
    </CardPreviewProvider>
  );
}
