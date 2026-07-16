import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate 950">
      <Card className="w-[700px]">
        <h1 className="text-5xl font-bold text-center mb-4">Board Games</h1>

        <p className="text-center text-slate-400 mb-10">
          Plataforma multijugador de juegos de mesa
        </p>

        <div className="flex justify-center gap-6">
          <Button onClick={() => navigate('/create')}>Crear sala</Button>
          <Button variant="secondary">Unirse</Button>
        </div>
      </Card>
    </div>
  );
}
