import './CardFan.css';
import PlayingCard from './PlayingCard.tsx';
import type { GameState } from '../../types/GameState.ts';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { useCardPreview } from '../../context/CardPreviewContext';

type CardType = GameState['players'][number]['hand'][number];

interface Props {
  cards: CardType[];
  isMyTurn: boolean;
  gamePhase: string;
  actionUsed: boolean;
  onPlay(cardId: string): void;
}

export default function CardFan({ cards, isMyTurn, gamePhase, actionUsed, onPlay }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { hidePreview } = useCardPreview();

  const selectedCard = cards.find((card) => card.id === selectedCardId);

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
              key={card.id}
              className="fan-card"
              style={{ transform: `rotate(${rotation}deg)`, zIndex: index }}
            >
              <PlayingCard
                name={card.name}
                image={card.image}
                size="large"
                disabled={!isMyTurn || gamePhase !== 'ACTION'}
                selected={selectedCardId === card.id}
                onClick={() => {
                  if (!isMyTurn) return;

                  if (gamePhase !== 'ACTION') return;

                  if (actionUsed) return;

                  selectCard(card.id);
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
                <button
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider glow-btn-emerald border border-emerald-400/20 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  onClick={() => {
                    onPlay(selectedCardId);
                    setSelectedCardId(null);
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  Jugar Carta
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
