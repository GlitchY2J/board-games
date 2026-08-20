import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { useState } from 'react';
import Deck from './Deck';
import DiscardViewer from './DiscardViewer';

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  localPlayerId: string;
}

export default function CenterArea({
  gameState,
  isMyTurn,
  localPlayerId,
}: Props) {
  const discardTop = gameState.discard[gameState.discard.length - 1];
  const [showDiscard, setShowDiscard] = useState(false);

  return (
    <>
      <div className="flex gap-16 items-center justify-center p-8 rounded-3xl glass-panel bg-slate-950/20 border border-slate-900/60 shadow-inner">
        {/* Nursery Pile */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/30 px-3 py-1.5 rounded-2xl border border-slate-800/40">
            Nursery
          </span>
          <div className="relative cursor-pointer">
            <PlayingCard
              name="Nursery"
              image="/cards/base/baby_back.png"
              size="medium"
              preview={false}
              plain
            />
          </div>
        </div>

        {/* Main Deck */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/30 px-3 py-1.5 rounded-2xl border border-slate-800/40">
            Deck
          </span>
          <div
            data-deck
            className="relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Deck
              gameState={gameState}
              isMyTurn={isMyTurn}
              localPlayerId={localPlayerId}
            />
          </div>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/30 px-3 py-1.5 rounded-2xl border border-slate-800/40">
            Discard
          </span>
          <div
            data-discard
            className="relative cursor-pointer"
            onClick={discardTop ? () => setShowDiscard(true) : undefined}
          >
            <div className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {discardTop ? (
              <PlayingCard
                name={discardTop.name}
                image={discardTop.image}
                size="medium"
                preview={false}
                plain
              />
            ) : (
              <div className="discard-placeholder">
                Vacío
              </div>
            )}
          </div>
        </div>
      </div>

      {showDiscard && (
        <DiscardViewer
          gameState={gameState}
          onClose={() => setShowDiscard(false)}
        />
      )}
    </>
  );
}
