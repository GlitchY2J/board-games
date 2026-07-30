import './CardSelectionOverlay.css';
import { useMemo, useState } from 'react';
import PlayingCard from '../card/PlayingCard';

export interface SelectionItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  items: SelectionItem[];
  maxSelection: number;
  confirmText?: string;
  onConfirm(cardIds: string[]): void;
  onCancel?(): void;
}

export default function CardSelectionOverlay({
  title,
  subtitle,
  items,
  maxSelection,
  confirmText = 'Confirmar',
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(cardId: string) {
    if (selected.includes(cardId)) {
      setSelected(selected.filter((id) => id !== cardId));
      return;
    }

    if (selected.length >= maxSelection) return;

    setSelected([...selected, cardId]);
  }

  const canConfirm = useMemo(
    () => selected.length === maxSelection,
    [selected, maxSelection],
  );

  return (
    <div className="overlay-backdrop">
      <div className="card-selection-window">
        <h2>{title}</h2>

        {subtitle && <p>{subtitle}</p>}

        <div className="card-selection-grid">
          {items.map((item) => {
            const active = selected.includes(item.id);

            return (
              <div
                key={item.id}
                className={`selection-card ${active ? 'selected' : ''}`}
                onClick={() => toggle(item.id)}
              >
                {item.image ? (
                  <PlayingCard
                    name={item.title}
                    image={item.image}
                    size="large"
                  />
                ) : (
                  <div className="selection-list-item">
                    <div className="selection-title">{item.title}</div>
                    {item.subtitle && (
                      <div className="selection-subtitle">{item.subtitle}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="selection-buttons">
          {onCancel && (
            <button className="cancel-button" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button
            className="confirm-button"
            disabled={!canConfirm}
            onClick={() => onConfirm(selected)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
