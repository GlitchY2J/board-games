import { Keyboard, X } from 'lucide-react';
import './ControlsOverlay.css';

interface Props {
  onClose(): void;
}

const controls = [
  ['C', 'Mostrar u ocultar el chat'],
  ['M', 'Abrir o cerrar el menú'],
  ['S', 'Ordenar las cartas de la mano'],
  ['I', 'Mostrar u ocultar el historial'],
  ['T', 'Terminar el turno'],
  ['D', 'Abrir la pila de descarte'],
  ['Flechas', 'Navegar entre cartas u opciones'],
  ['0 - 9', 'Seleccionar una opción numerada'],
  ['Enter', 'Confirmar o abrir la selección'],
  ['Esc', 'Cerrar una selección o diálogo'],
];

export default function ControlsOverlay({ onClose }: Props) {
  return (
    <div className="controls-overlay-backdrop" onClick={onClose}>
      <section
        className="controls-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-overlay-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="controls-overlay-header">
          <div>
            <span className="controls-overlay-kicker">Guía rápida</span>
            <h2 id="controls-overlay-title"><Keyboard size={21} /> Controles</h2>
          </div>
          <button type="button" className="controls-overlay-close" onClick={onClose} aria-label="Cerrar controles">
            <X size={18} />
          </button>
        </header>
        <div className="controls-list">
          {controls.map(([key, description]) => (
            <div className="control-row" key={key}>
              <kbd>{key}</kbd>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
