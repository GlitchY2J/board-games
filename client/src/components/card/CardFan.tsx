import './CardFan.css';
import PlayingCard from './PlayingCard.tsx';
import type { GameState } from '../../types/GameState.ts';
import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { useCardPreview } from '../../context/useCardPreview';

type CardType = GameState['players'][number]['hand'][number];

interface Props {
  cards: CardType[];
  isMyTurn: boolean;
  gamePhase: string;
  actionUsed: boolean;
  pendingPlay: boolean;
  blockedCardIds?: Set<string>;
  onPlay(cardId: string): void;
  onPlayCards?(cardIds: string[]): void;
  onSelectionChange?(selected: boolean): void;
  onInvalidAction?(message: string): void;
  compact?: boolean;
  gameId?: string;
  sortHandMode?: 'alphabetical' | 'type' | null;
}

function getCardTypeRank(card: CardType): number {
  if (card.cardType === 'unicorn') {
    return card.unicornClass === 'magical' ? 1 : 0;
  }

  if (card.cardType === 'magic') return 2;
  if (card.cardType === 'upgrade') return 3;
  if (card.cardType === 'downgrade') return 4;
  if (card.cardType === 'instant' && card.id.includes('neigh')) return 5;

  const remainingRanks: Partial<Record<CardType['cardType'], number>> = {
    instant: 6,
    action: 7,
    cat: 8,
    defuse: 9,
    exploding_kitten: 10,
  };
  return remainingRanks[card.cardType] ?? 11;
}

export default function CardFan({
  cards,
  isMyTurn,
  gamePhase,
  actionUsed,
  pendingPlay,
  blockedCardIds,
  onPlay,
  onPlayCards,
  onSelectionChange,
  onInvalidAction,
  compact = false,
  gameId,
  sortHandMode = null,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const [fanWidth, setFanWidth] = useState(0);
  const { hidePreview } = useCardPreview();

  const [newCardUids, setNewCardUids] = useState<Set<string>>(new Set());
  const prevCardsRef = useRef<Set<string> | null>(null);
  const seenCardUidsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentUids = new Set(cards.map((c) => c.uid));

    if (prevCardsRef.current === null) {
      seenCardUidsRef.current = new Set(currentUids);
      prevCardsRef.current = currentUids;
      return;
    }

    const freshUids = cards
      .map((card) => card.uid)
      .filter((uid) => !seenCardUidsRef.current.has(uid));
    freshUids.forEach((uid) => seenCardUidsRef.current.add(uid));

    if (freshUids.length > 0) {
      const newestUid = freshUids[freshUids.length - 1];

      setNewCardUids(new Set([newestUid]));

      const timer = setTimeout(() => {
        setNewCardUids(new Set());
      }, 5000);

      prevCardsRef.current = currentUids;
      return () => clearTimeout(timer);
    }

    prevCardsRef.current = currentUids;
  }, [cards]);

  useLayoutEffect(() => {
    const element = fanRef.current;
    if (!element) return;

    const updateWidth = () => setFanWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const displayCards = sortHandMode
    ? [...cards].sort((a, b) => {
        if (sortHandMode === 'type') {
          const rankDifference =
            getCardTypeRank(a) - getCardTypeRank(b);
          if (rankDifference !== 0) return rankDifference;
        }

        return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
          sensitivity: 'base',
        });
      })
    : cards;

  const cardCount = displayCards.length;
  const overlap = Math.min(60, Math.max(12, fanWidth * 0.2));
  const cardWidth = fanWidth > 0
    ? Math.min(148, Math.max(48, (fanWidth + overlap * Math.max(0, cardCount - 1)) / Math.max(1, cardCount)))
    : 148;

  useEffect(() => {
    onSelectionChange?.(selectedCardId !== null);
  }, [selectedCardId, onSelectionChange]);

  useEffect(() => {
    if (!selectedCardId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedCardId(null);
        return;
      }

      if (event.key.toLowerCase() !== 'a') return;

      const confirmButton = document.querySelector<HTMLElement>(
        '[data-card-confirm]',
      );
      if (!confirmButton) return;

      event.preventDefault();
      event.stopPropagation();
      confirmButton.click();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCardId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return;

      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }

      if (selectedCardId) return;

      const keyIndex =
        event.key === '0' ? 9 : Number.parseInt(event.key, 10) - 1;
      if (
        Number.isNaN(keyIndex) ||
        keyIndex < 0 ||
        keyIndex >= displayCards.length ||
        keyIndex > 9
      )
        return;

      event.preventDefault();
      event.stopPropagation();

      // Reutiliza el mismo flujo del clic para mantener todas las validaciones.
      document
        .querySelector<HTMLElement>(`[data-card-hotkey="${keyIndex}"]`)
        ?.querySelector<HTMLElement>('.playing-card')
        ?.click();
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [displayCards.length, selectedCardId]);

  const selectedCard = cards.find((card) => card.uid === selectedCardId);
  const isCat = selectedCard?.cardType === 'cat';
  const matchingCats = isCat
    ? cards.filter((card) => card.id === selectedCard.id && card.uid !== selectedCard.uid)
    : [];
  const canPlayPair = matchingCats.length >= 1;
  const canPlayTrio = matchingCats.length >= 2;
  const isBlocked = (cardId: string) => blockedCardIds?.has(cardId) ?? false;

  const blockedReason = (card: CardType): string => {
    if (card.cardType === 'upgrade') {
      return 'Broken Stable impide que juegues cartas de Upgrade.';
    }

    if (card.cardType === 'unicorn' && card.unicornClass === 'basic') {
      return 'Queen Bee Unicorn impide que los unicornios básicos entren a tu establo.';
    }

    return 'No puedes jugar esta carta ahora.';
  };

  const isNeigh = (card: CardType) =>
    card.effect === 'neigh' || card.effect === 'super_neigh';

  function selectCard(cardId: string) {
    hidePreview();
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  }

  return (
    <>
      <div className="card-fan-wrap">
        <div
          ref={fanRef}
          className={`card-fan${compact && cards.length > 12 ? ' card-fan-compact' : ''}${cards.length > 10 ? ' card-fan-many' : ''}`}
          style={{
            '--hand-card-width': `${cardWidth}px`,
            '--hand-card-overlap': `-${overlap}px`,
          } as CSSProperties}
        >
        {displayCards.map((card, index) => {
          const total = displayCards.length;
          const middle = (total - 1) / 2;
          const rotation = (index - middle) * 5;
          const hotkey = index < 9 ? index + 1 : index === 9 ? 0 : null;
          const isNew = newCardUids.has(card.uid);

          return (
            <div
              key={card.uid}
              className={`fan-card${isNew ? ' arrived-glow' : ''}`}
              data-card-uid={card.uid}
              data-card-hotkey={index}
              style={{ transform: `rotate(${rotation}deg)`, zIndex: isNew ? 100 : index }}
            >
              {hotkey !== null && !isNew && (
                <span className="card-hotkey" aria-hidden="true">
                  {hotkey}
                </span>
              )}
              <PlayingCard
                name={card.name}
                image={card.image}
                size="large"
                disabled={false}
                selected={selectedCardId === card.uid}
                onClick={() => {
                  const isNow = card.effect === 'now';

                  if (!isMyTurn && !isNow) {
                    onInvalidAction?.('No es tu turno');
                    return;
                  }

                  if (!isNow && gamePhase !== 'ACTION') {
                    onInvalidAction?.(
                      'Solo puedes jugar cartas durante tu fase de acción',
                    );
                    return;
                  }

                  if (!isNow && actionUsed) {
                    onInvalidAction?.('Ya jugaste una carta este turno');
                    return;
                  }

                  if (pendingPlay) {
                    onInvalidAction?.('Hay otra carta esperando a resolverse');
                    return;
                  }

                  if (
                    gameId &&
                    (card.id === 'defuse' || card.id === 'nope' || card.effect === 'nope')
                  ) {
                    onInvalidAction?.('No puedes jugar esta carta en este momento');
                    return;
                  }

                  if (isBlocked(card.uid)) {
                    onInvalidAction?.(blockedReason(card));
                    return;
                  }

                  if (isNeigh(card)) {
                    onInvalidAction?.(
                      'Neigh solo puede jugarse como respuesta a la carta de otro jugador',
                    );
                    return;
                  }

                  selectCard(card.uid);
                }}
              />
            </div>
          );
        })}
        </div>
      </div>

      {selectedCardId &&
        selectedCard &&
        createPortal(
          <div
            className="card-select-backdrop"
            onClick={() => setSelectedCardId(null)}
          >
            <div
              className="card-select-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <PlayingCard
                name={selectedCard.name}
                image={selectedCard.image}
                size="large"
                preview={false}
              />

               <div className="card-select-actions flex items-center justify-center gap-4 px-6 py-4 rounded-3xl glass-panel bg-slate-950/90 shadow-2xl">
                <button
                   className="card-select-cancel flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer active:scale-95"
                  onClick={() => setSelectedCardId(null)}
                >
                  <X size={14} />
                  Cancelar
                </button>

                {isBlocked(selectedCardId) ? (
                  <p className="text-xs text-slate-400 font-medium max-w-[200px] text-center">
                    {blockedReason(selectedCard)}
                  </p>
                ) : isNeigh(selectedCard) ? (
                  <p className="text-xs text-slate-400 font-medium max-w-[200px] text-center">
                    Neigh solo puede jugarse como respuesta a la carta de otro
                    jugador.
                  </p>
                ) : gameId === 'exploding-kittens' && isCat ? (
                  <div className="cat-combo-actions">
                    <button
                      className="cat-combo-button cat-combo-single"
                      onClick={() => {
                        onPlay(selectedCardId);
                        setSelectedCardId(null);
                      }}
                    >
                      Jugar Carta
                    </button>
                    {canPlayPair && (
                      <button
                        className="cat-combo-button cat-combo-pair"
                        onClick={() => {
                          onPlayCards?.([selectedCardId, matchingCats[0].uid]);
                          setSelectedCardId(null);
                        }}
                      >
                        Two of a kind
                      </button>
                    )}
                    {canPlayTrio && (
                      <button
                        className="cat-combo-button cat-combo-trio"
                        onClick={() => {
                          onPlayCards?.([
                            selectedCardId,
                            matchingCats[0].uid,
                            matchingCats[1].uid,
                          ]);
                          setSelectedCardId(null);
                        }}
                      >
                        Three of a kind
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    data-card-confirm
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider glow-btn-emerald border border-emerald-400/20 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                    onClick={() => {
                      if (actionUsed) {
                        onInvalidAction?.('Ya jugaste una carta este turno');
                        setSelectedCardId(null);
                        return;
                      }

                      if (pendingPlay) {
                        onInvalidAction?.(
                          'Hay otra carta esperando a resolverse',
                        );
                        setSelectedCardId(null);
                        return;
                      }

                      onPlay(selectedCardId);
                      setSelectedCardId(null);
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                    Jugar Carta
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
