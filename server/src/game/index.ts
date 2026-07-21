import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from '../RoomManager.ts';
import { CardLoader } from './CardLoader.ts';
import roomRoutes from './routes/roomRoutes.ts';

export const roomManager = new RoomManager();

const app = express();

const cards = CardLoader.load();
console.log(cards);

app.use(cors());
app.use(express.json());

app.use('/rooms', roomRoutes);

app.get('/', (_, res) => {
  res.send('Servidor funcionando');
});

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
