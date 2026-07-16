import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
        <button
          onClick={() => navigate('/create')}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl"
        >
          Crear sala
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-xl">
          Unirse
        </button>
      </div>
    </div>
  );
}
