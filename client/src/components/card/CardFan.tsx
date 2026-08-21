import './CardFan.css';
import PlayingCard from './PlayingCard.tsx';
import type { GameState } from '../../types/GameState.ts';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { useCardPreview } from '../../context/CardPreviewContext';

type CardType = GameState['players'][number]['hand'][number];

interface Props {
  cards: CardType[];
  isMyTurn: boolean;
  gamePhase: string;
  actionUsed: boolean;
  pendingPlay: boolean;
  blockedCardIds?: Set<string>;
  onPlay(cardId: string): void;
  onSelectionChange?(selected: boolean): void;
  onInvalidAction?(message: string): void;
}

export default function CardFan({
  cards,
  isMyTurn,
  gamePhase,
  actionUsed,
  pendingPlay,
  blockedCardIds,
  onPlay,
  onSelectionChange,
  onInvalidAction,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { hidePreview } = useCardPreview();

  useEffect(() => {
    onSelectionChange?.(selectedCardId !== null);
  }, [selectedCardId, onSelectionChange]);

  const selectedCard = cards.find((card) => card.uid === selectedCardId);
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
      <div className="card-fan">
        {cards.map((card, index) => {
          const total = cards.length;
          const middle = (total - 1) / 2;
          const rotation = (index - middle) * 5;

          return (
            <div
              key={card.uid}
              className="fan-card"
              style={{ transform: `rotate(${rotation}deg)`, zIndex: index }}
            >
              <PlayingCard
                name={card.name}
                image={card.image}
                size="large"
                disabled={false}
                selected={selectedCardId === card.uid}
                onClick={() => {
                  if (!isMyTurn) {
                    onInvalidAction?.('No es tu turno');
                    return;
                  }

                  if (gamePhase !== 'ACTION') {
                    onInvalidAction?.(
                      'Solo puedes jugar cartas durante tu fase de acción',
                    );
                    return;
                  }

                  if (actionUsed) {
                    onInvalidAction?.('Ya jugaste una carta este turno');
                    return;
                  }

                  if (pendingPlay) {
                    onInvalidAction?.('Hay otra carta esperando a resolverse');
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

              <div className="flex items-center justify-center gap-4 px-6 py-4 rounded-3xl glass-panel bg-slate-950/90 border border-slate-900/60 shadow-2xl">
                <button
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer active:scale-95"
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
                ) : (
                  <button
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
