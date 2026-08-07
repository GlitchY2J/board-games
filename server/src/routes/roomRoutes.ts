import { Router } from 'express';
import { roomManager } from '../roomManagerInstance.ts';

const router = Router();

router.post('/create', (req, res) => {
  const { hostName, game, socketId } = req.body;

  if (!hostName || !game || !socketId) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  const room = roomManager.createRoom(hostName, game, socketId);

  res.json(room);
});

router.post('/join', (req, res) => {
  const { roomCode, playerName, socketId } = req.body;

  if (!roomCode || !playerName || !socketId) {
    return res.status(400).json({
      error: 'Datos incompletos',
    });
  }

  const room = roomManager.joinRoom(roomCode, playerName, socketId);

  if (!room) {
    return res.status(404).json({
      error: 'Sala no encontrada',
    });
  }

  res.json(room);
});

export default router;
