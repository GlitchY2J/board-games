import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import './DiscardViewer.css';

interface Props {
  gameState: GameState;
  onClose(): void;
}

export default function DiscardViewer({ gameState, onClose }: Props) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const cards = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return [...gameState.discard]
      .reverse()
      .filter((card) => activeFilter === 'all' || card.cardType === activeFilter)
      .filter((card) => {
        if (!normalizedSearch) return true;

        return [card.name, card.id, card.description]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      });
  }, [activeFilter, gameState.discard, search]);

  const filterOptions: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'unicorn', label: 'Unicornios' },
    { value: 'magic', label: 'Magias' },
    { value: 'upgrade', label: 'Upgrades' },
    { value: 'downgrade', label: 'Downgrades' },
    { value: 'instant', label: 'Instantáneas' },
  ];

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className="card-selection-window"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="discard-close" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>

        <h2>Pila de descarte</h2>
        <p className="discard-count">
          {cards.length} de {gameState.discard.length}{' '}
          {gameState.discard.length === 1 ? 'carta' : 'cartas'}
        </p>

        <div className="discard-toolbar">
          <label className="discard-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar en el descarte</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar carta..."
            />
            {search && (
              <button
                type="button"
                className="discard-search-clear"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <div className="discard-filters" role="group" aria-label="Filtrar cartas">
            {filterOptions.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={activeFilter === filter.value ? 'active' : ''}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-selection-grid">
          {cards.length > 0 ? (
            cards.map((card) => (
              <div key={card.uid} className="selection-card">
                <div className="selection-card-content">
                  <PlayingCard name={card.name} image={card.image} size="large" />
                  <div className="selection-card-title">{card.name}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="discard-empty">
              <Search size={28} />
              <strong>No se encontraron cartas</strong>
              <span>Prueba con otro filtro o término de búsqueda.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | 'unicorn' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
