import { Router } from 'express';
import { roomService, RoomServiceError } from '../services/RoomService.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { createPublicRoom } from '../sockets/publicRoom.ts';

const router = Router();

router.post('/create', (req, res) => {
  const { hostName, avatar } = req.body;

  if (!hostName) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  const { room, player: host } = roomService.createRoom(hostName, avatar);

  res.json({
    room: createPublicRoom(room),
    playerId: host?.id,
    sessionToken: host?.sessionToken,
  });
});

router.post('/join', (req, res) => {
  const { roomCode, playerName, avatar } = req.body;

  if (!roomCode || !playerName) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  let result;
  try {
    result = roomService.joinRoom(roomCode, playerName, avatar);
  } catch (error) {
    if (error instanceof RoomServiceError && error.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
  const { room, player } = result;

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
    settings: room.settings,
    playerCount: room.players.length,
    takenAvatars,
  });
});

export default router;
