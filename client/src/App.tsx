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

export default function App() {
  useEffect(() => {
    socket.connect();

    console.log('Conectando al servidor...');

    return () => {
      socket.disconnect();

      console.log('Desconectado del servidor.');
    };
  }, []);

  return (
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
  );
}
