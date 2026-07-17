import { Router } from 'express';
import RoomManager from '../managers/RoomManager.ts';
import type { Room } from '../models/Room.ts';

const router = Router();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post('/create', (req, res) => {
  const room: Room = {
    code: generateCode(),
    game: req.body.game,
    hostId: crypto.randomUUID(),
    players: [
      {
        id: crypto.randomUUID(),
        name: req.body.playerName,
        ready: false,
      },
    ],
  };
  RoomManager.createRoom(room);
  res.json(room);
});

router.get('/', (req, res) => {
  res.json(RoomManager.getRooms());
});

export default router;
