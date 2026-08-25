import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.ts';
import gameRoutes from './routes/gameRoutes.ts';
import { initializeSocket } from './socket.ts';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/types/SocketEvents.ts';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = allowedOrigins.length === 1 && allowedOrigins[0] === '*'
  ? '*'
  : allowedOrigins;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/rooms', roomRoutes);
app.use('/games', gameRoutes);

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado en ${HOST}:${PORT}`);
});
