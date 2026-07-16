import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-6xl font-bold mb-4"
      >
        Board Games
      </motion.h1>

      <p className="text-gray-400 mb-12">
        Plataforma multijugador de juegos de mesa
      </p>

      <div className="flex gap-6">
        <Button onClick={() => navigate('/create')}>Crear sala</Button>
        <Button variant="secondary">Unirse</Button>
      </div>
    </div>
  );
}
