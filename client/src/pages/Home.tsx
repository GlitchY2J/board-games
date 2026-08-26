import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="platform-flat-page min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Círculos de luz decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-xl animate-float relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 uppercase">
            ⚡ Plataforma Beta
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-center tracking-tight mb-4">
            Board <span className="text-gradient-emerald font-black">Games</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto">
            Disfruta de tus juegos de mesa favoritos con amigos en tiempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
          <Button onClick={() => navigate('/create')} className="w-full sm:w-48">
            Crear sala
          </Button>
          <Button variant="secondary" onClick={() => navigate('/join')} className="w-full sm:w-48">
            Unirse
          </Button>
        </div>
      </Card>
    </div>
  );
}
