import { Router } from 'express';
import { roomManager } from '../index.ts';
import type { Room } from '../models/Room.ts';

const router = Router();

// Crear una sala
router.post('/create', (req, res) => {
  const { playerName, game } = req.body;

  if (!playerName || !game) {
    return res.status(400).json({
      message: 'Faltan datos.',
    });
  }

  const room = roomManager.creatRoom(playerName, game, '');

  res.json(room);
});

// Buscar sala por código
router.get('/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      message: 'Sala no encontrada.',
    });
  }
  res.json(room);
});

// Unirse a una sala
router.post('/join', (req, res) => {
  const { roomCode, playerName } = req.body;

  if (!roomCode || !playerName) {
    return res.status(400).json({
      message: 'Faltan datos.',
    });
  }

  const room = roomManager.joinRoom(roomCode, playerName, '');

  if (!room) {
    return res.status(404).json({
      message: 'La sala no existe.',
    });
  }
  res.json(room);
});

export default router;
