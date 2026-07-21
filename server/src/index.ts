import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.ts';
import { initializeSocket } from './socket.ts';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/rooms', roomRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
