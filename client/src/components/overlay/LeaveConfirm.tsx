import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import './LeaveConfirm.css';

interface Props {
  title?: string;
  description?: string;
  onConfirm(): void;
  onCancel(): void;
}

export default function LeaveConfirm({
  title = '¿Salir de la partida?',
  description = 'Si sales, perderás tu lugar en el tablero y la partida continuará sin ti.',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      event.preventDefault();
      event.stopPropagation();
      onConfirm();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onConfirm]);

  return createPortal(
    <div className="leave-confirm-backdrop" onClick={onCancel}>
      <div
        className="leave-confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="leave-confirm-icon">
          <LogOut size={24} />
        </div>
        <h3 className="leave-confirm-title">{title}</h3>
        <p className="leave-confirm-desc">{description}</p>
        <div className="leave-confirm-actions">
          <button
            className="leave-confirm-btn leave-confirm-cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="leave-confirm-btn leave-confirm-ok"
            onClick={onConfirm}
          >
            Salir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
