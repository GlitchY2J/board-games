import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from '../types/Room';
import type { GameState } from '../types/GameState';
import { socket } from '../services/socket';
import { getSession, clearSession } from '../services/session';
import { GameContext, type SessionStatus } from './GameStore';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [room, setRoom] = useState<Room>();
  const [gameState, setGameState] = useState<GameState>();
  const [playerId, setPlayerId] = useState<string>();
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);

  const resume = useCallback(() => {
    const session = getSession();

    if (!session) {
      setStatus('none');
      return;
    }

    socket.emit(
      'resume-session',
      { roomCode: session.roomCode, sessionToken: session.sessionToken },
      (response) => {
        if (response.success && response.room) {
          const resumedPlayerId = response.playerId ?? session.playerId;

          setRoom(response.room);
          setGameState(response.gameState ?? undefined);
          setPlayerId(resumedPlayerId);
          setPlayerName(
            response.room.players.find((p) => p.id === resumedPlayerId)
              ?.name ?? '',
          );
          setIsHost(response.room.hostId === resumedPlayerId);
          setStatus('active');
        } else {
          clearSession();
          setRoom(undefined);
          setGameState(undefined);
          setPlayerId(undefined);
          setPlayerName('');
          setIsHost(false);
          setStatus('none');
        }
      },
    );
  }, []);

  const resumeRef = useRef(resume);
  const playerIdRef = useRef(playerId);

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    socket.connect();

    resumeRef.current();

    const onRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setIsHost(updatedRoom.hostId === playerIdRef.current);
    };
    const onGameUpdated = (state: GameState) => setGameState(state);

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-updated', onGameUpdated);

    const onConnect = () => {
      const session = getSession();
      if (session) {
        resumeRef.current();
      }
    };

    socket.on('connect', onConnect);

    return () => {
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-updated', onGameUpdated);
      socket.off('connect', onConnect);
    };
  }, []);

  const activate = (data: {
    room: Room;
    playerId: string;
    isHost: boolean;
    playerName?: string;
  }) => {
    setRoom(data.room);
    setPlayerId(data.playerId);
    setPlayerName(data.playerName ?? '');
    setIsHost(data.isHost);
    setStatus('active');
  };

  const deactivate = () => {
    clearSession();
    setRoom(undefined);
    setGameState(undefined);
    setPlayerId(undefined);
    setPlayerName('');
    setIsHost(false);
    setStatus('none');
  };

  return (
    <GameContext.Provider
      value={{
        status,
        room,
        gameState,
        playerId,
        playerName,
        isHost,
        setRoom,
        setPlayerName,
        activate,
        deactivate,
        resume,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

