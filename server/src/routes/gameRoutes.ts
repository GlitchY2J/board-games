import { Router } from 'express';
import { gameRegistry } from '../games/catalog.ts';

const router = Router();

router.get('/', (_req, res) => {
  res.json(gameRegistry.getAll());
});

router.get('/:gameId', (req, res) => {
  const game = gameRegistry.getById(req.params.gameId);

  if (!game) {
    return res.status(404).json({
      error: 'Juego no encontrado',
    });
  }

  res.json(game);
});

export default router;
