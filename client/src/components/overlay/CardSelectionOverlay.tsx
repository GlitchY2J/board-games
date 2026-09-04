import './CardSelectionOverlay.css';
import { useEffect, useMemo, useState } from 'react';
import PlayingCard from '../card/PlayingCard';

export interface SelectionItem {
  id: string;
  value?: string;
  title: string;
  subtitle?: string;
  image?: string;
  avatar?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  items: SelectionItem[];
  maxSelection: number;
  minSelection?: number;
  confirmText?: string;
  hide?: boolean;
  onConfirm(cardIds: string[]): void;
  onCancel?(): void;
  secondaryText?: string;
  onSecondary?(): void;
  searchable?: boolean;
  searchPlaceholder?: string;
  keyboardNavigation?: boolean;
}

export default function CardSelectionOverlay({
  title,
  subtitle,
  items,
  maxSelection,
  minSelection = maxSelection,
  confirmText = 'Confirmar',
  hide = false,
  onConfirm,
  onCancel,
  secondaryText,
  onSecondary,
  searchable = false,
  searchPlaceholder = 'Buscar carta...',
  keyboardNavigation = maxSelection === 1,
}: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(() =>
    maxSelection === 1 && items.length === 1 ? [items[0].id] : [],
  );

  useEffect(() => {
    if (!keyboardNavigation || maxSelection !== 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

      const currentIndex = selected.length > 0
        ? items.findIndex((item) => item.id === selected[0])
        : -1;
      let nextIndex = -1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (items.length === 0) return;
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        nextIndex = (currentIndex + direction + items.length) % items.length;
      } else {
        const number = event.key === '0' ? 10 : Number.parseInt(event.key, 10);
        if (Number.isInteger(number) && number >= 1 && number <= 10) {
          nextIndex = number - 1;
          if (!items[nextIndex]) return;
        }
      }

      if (nextIndex >= 0) {
        event.preventDefault();
        event.stopPropagation();
        setSelected([items[nextIndex].id]);
        return;
      }

    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [items, keyboardNavigation, maxSelection, onConfirm, selected]);

  if (hide) return null;

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
    () => selected.length >= minSelection && selected.length <= maxSelection,
    [selected, minSelection, maxSelection],
  );

  const selectedValues = useMemo(() => {
    return selected.map((selectedId) => {
      const item = items.find((i) => i.id === selectedId);
      return item?.value ?? selectedId;
    });
  }, [selected, items]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return items;
    return items.filter((item) =>
      `${item.title} ${item.subtitle ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    );
  }, [items, search]);

  return (
    <div className={`overlay-backdrop ${hide ? 'animating-out' : ''}`}>
      <div className={`card-selection-window ${hide ? 'animating-out' : ''}`}>
        <h2>{title}</h2>

        {subtitle && <p>{subtitle}</p>}

        {searchable && (
          <input
            className="selection-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        )}

        <div className="card-selection-grid">
          {visibleItems.map((item) => {
            const active = selected.includes(item.id);

            return (
              <div
                key={item.id}
                className={`selection-card ${active ? 'selected' : ''}`}
                onClick={() => toggle(item.id)}
              >
                {active && <div className="selection-badge">✓</div>}
                {item.image && keyboardNavigation && items.length <= 10 && (
                  <kbd className="selection-hotkey selection-card-hotkey">
                    {items.findIndex((candidate) => candidate.id === item.id) === 9
                      ? '0'
                      : items.findIndex((candidate) => candidate.id === item.id) + 1}
                  </kbd>
                )}
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
                     {keyboardNavigation && items.length <= 10 && (
                       <kbd className="selection-hotkey">
                         {items.findIndex((candidate) => candidate.id === item.id) === 9
                           ? '0'
                           : items.findIndex((candidate) => candidate.id === item.id) + 1}
                       </kbd>
                     )}
                    <div className="selection-list-avatar">
                      {item.avatar ? (
                        <img
                          src={`/avatars/${item.avatar}.png`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlayingCard
                          name={item.title}
                          image="/cards/unstable-unicorns/base/card_back.png"
                          size="small"
                          preview={false}
                        />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="selection-title">{item.title}</div>
                      {item.subtitle && (
                        <div className="selection-subtitle">{item.subtitle}</div>
                      )}
                    </div>
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
          {onSecondary && (
            <button className="cancel-button" onClick={onSecondary}>
              {secondaryText ?? 'Otra opción'}
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
