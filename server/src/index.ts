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
  },
});

initializeSocket(io);

server.listen(3000, () => {
  console.log('Servidor iniciado en puerto 3000');
});
