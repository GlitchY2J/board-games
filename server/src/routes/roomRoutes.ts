import { Router } from 'express';
import { roomManager } from '../roomManagerInstance.ts';
import { createPublicRoom } from '../sockets/publicRoom.ts';

const router = Router();

router.post('/create', (req, res) => {
  const { hostName, socketId, avatar } = req.body;

  if (!hostName || !socketId) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  const room = roomManager.createRoom(hostName, null, socketId, avatar);

  const host = room.players.find((player) => player.id === room.hostId);

  res.json({
    room: createPublicRoom(room),
    playerId: host?.id,
    sessionToken: host?.sessionToken,
  });
});

router.post('/join', (req, res) => {
  const { roomCode, playerName, socketId, avatar } = req.body;

  if (!roomCode || !playerName || !socketId) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  const room = roomManager.joinRoom(roomCode, playerName, socketId, avatar);

  const player = room?.players.find(
    (candidate) => candidate.socketId === socketId,
  );

  if (!room) {
    return res.status(404).json({
      error: 'Sala no encontrada',
    });
  }

  res.json({
    room: createPublicRoom(room),
    playerId: player?.id,
    sessionToken: player?.sessionToken,
  });
});

router.get('/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code.toUpperCase());

  if (!room) {
    return res.status(404).json({
      error: 'Sala no encontrada',
    });
  }

  const takenAvatars = room.players
    .map((player) => player.avatar)
    .filter(Boolean);

  res.json({
    code: room.code,
    game: room.game,
    playerCount: room.players.length,
    takenAvatars,
  });
});

export default router;
