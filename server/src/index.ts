import express from 'express';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.ts';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/rooms', roomRoutes);

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
