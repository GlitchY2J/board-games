import './CardSelectionOverlay.css';
import { useEffect, useMemo, useState } from 'react';
import PlayingCard from '../card/PlayingCard';

export interface SelectionItem {
  id: string;
  value?: string;
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
  hide?: boolean;
  onConfirm(cardIds: string[]): void;
  onCancel?(): void;
}

export default function CardSelectionOverlay({
  title,
  subtitle,
  items,
  maxSelection,
  confirmText = 'Confirmar',
  hide = false,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (maxSelection === 1 && items.length === 1) {
      setSelected([items[0].id]);
    }
  }, [items, maxSelection]);

  function toggle(itemId: string) {
    if (selected.includes(itemId)) {
      setSelected(selected.filter((id) => id !== itemId));
      return;
    }

    if (maxSelection === 1) {
      setSelected([itemId]);
      return;
    }

    if (selected.length >= maxSelection) return;

    setSelected([...selected, itemId]);
  }

  const canConfirm = useMemo(
    () => selected.length === maxSelection,
    [selected, maxSelection],
  );

  const selectedValues = useMemo(() => {
    return selected.map((selectedId) => {
      const item = items.find((i) => i.id === selectedId);
      return item?.value ?? selectedId;
    });
  }, [selected, items]);

  return (
    <div className={`overlay-backdrop ${hide ? 'animating-out' : ''}`}>
      <div className={`card-selection-window ${hide ? 'animating-out' : ''}`}>
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
                {active && <div className="selection-badge">✓</div>}
                {item.image ? (
                  <div className="selection-card-content">
                    <PlayingCard
                      name={item.title}
                      image={item.image}
                      size="large"
                      selected={active}
                      preview={!item.image.includes('card_back')}
                    />
                    <div className="selection-card-title">{item.title}</div>
                    {item.subtitle && (
                      <div className="selection-subtitle">{item.subtitle}</div>
                    )}
                  </div>
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
            onClick={() => onConfirm(selectedValues)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
