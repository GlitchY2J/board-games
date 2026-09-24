import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
import PhasePanel from '../components/game/PhasePanel';
import Chat from '../components/game/Chat';
import TurnOrder from '../components/game/TurnOrder';
import PhaseActionButton from '../components/game/PhaseActionButton';
import PlayerHand from '../components/player/PlayerHand';
import PlayingCard from '../components/card/PlayingCard';
import GameOverlay from '../components/overlay/GameOverlay';
import CardSelectionOverlay from '../components/overlay/CardSelectionOverlay';
import PendingPlayOverlay from '../components/overlay/PendingPlayOverlay';
import NeighRevealOverlay from '../components/overlay/NeighRevealOverlay';
import { getPlayerStatus } from '../lib/playerStatus';
import PlayerInfo from '../components/player/PlayerInfo';
import PlayerNotification from '../components/player/PlayerNotification';
import {
  RotateCcw,
  LogOut,
  Bot,
  Bug,
  MessageSquare,
  Copy,
  Check,
  Menu,
  X,
  Settings as SettingsIcon,
  Keyboard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeaveConfirm from '../components/overlay/LeaveConfirm';
import ControlsOverlay from '../components/overlay/ControlsOverlay';
import { useState, useEffect, useRef } from 'react';

type PlatformTheme = 'classic' | 'midnight' | 'ember' | 'nebula';

const PLATFORM_THEMES: {
  id: PlatformTheme;
  name: string;
  description: string;
  colors: string[];
}[] = [
  {
    id: 'classic',
    name: 'Obsidiana',
    description: 'Elegancia oscura y neutral',
    colors: ['#0b0d11', '#334155', '#94a3b8'],
  },
  {
    id: 'midnight',
    name: 'Aurora nocturna',
    description: 'Azules profundos y energía eléctrica',
    colors: ['#050b1c', '#1d4ed8', '#22d3ee'],
  },
  {
    id: 'ember',
    name: 'Volcán',
    description: 'Calidez intensa con tonos de fuego',
    colors: ['#180b0a', '#b45309', '#fb7185'],
  },
  {
    id: 'nebula',
    name: 'Nebulosa',
    description: 'Violetas cósmicos y acentos magenta',
    colors: ['#10091f', '#7e22ce', '#f472b6'],
  },
];

interface Props {
  gameState: GameState;
  gameId?: string;
  isMyTurn: boolean;
  isHost: boolean;
  onPlay(cardId: string, cardIds?: string[]): void;
  hidePendingPlay?: boolean;
  sortHandMode?: 'alphabetical' | 'type' | null;
  hiddenHandCardIds?: Set<string>;
  localHandOverride?: GameState['players'][number]['hand'];
  animatedHandPlayerId?: string;
  animatedHandCount?: number;
  interactionsDisabled?: boolean;
  spectator?: boolean;
  onLeaveLobby?(): void;
}

export default function BoardLayout({
  gameState,
  gameId,
  isMyTurn,
  isHost,
  onPlay,
  hidePendingPlay = false,
  sortHandMode = null,
  hiddenHandCardIds,
  localHandOverride,
  animatedHandPlayerId,
  animatedHandCount,
  interactionsDisabled = false,
  spectator = false,
  onLeaveLobby,
}: Props) {
  const navigate = useNavigate();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [platformTheme, setPlatformTheme] = useState<PlatformTheme>(
    () =>
      (localStorage.getItem('platform-theme') as PlatformTheme | null) ??
      'classic',
  );
  const [pendingTheme, setPendingTheme] =
    useState<PlatformTheme>(platformTheme);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [selectedAlluringUpgradeId, setSelectedAlluringUpgradeId] = useState<string | null>(null);
  const [selectedChainsawCardId, setSelectedChainsawCardId] = useState<string | null>(null);
  const [selectedDarkAngelCardId, setSelectedDarkAngelCardId] = useState<string | null>(null);
  const [selectedExtremelyDestructiveCardId, setSelectedExtremelyDestructiveCardId] = useState<string | null>(null);
  const [selectedMermaidCardId, setSelectedMermaidCardId] = useState<string | null>(null);
  const [selectedNecromancerCardIds, setSelectedNecromancerCardIds] = useState<Set<string>>(new Set());
  const [selectedNecromancerCardId, setSelectedNecromancerCardId] = useState<string | null>(null);
  const [selectedRainbowCardId, setSelectedRainbowCardId] = useState<string | null>(null);
  const [neighSelectionActive, setNeighSelectionActive] = useState(false);

  useEffect(() => {
    const onOverlayConfirm = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (document.querySelector('.leave-confirm-backdrop')) return;
      const button = document.querySelector<HTMLButtonElement>(
        '.pending-accept-btn:not(:disabled), .overlay-backdrop .confirm-button:not(:disabled)',
      );
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      button.click();
    };
    window.addEventListener('keydown', onOverlayConfirm, true);
    return () => window.removeEventListener('keydown', onOverlayConfirm, true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !menuToggleRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', closeMenuOnEscape);
    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeMenuOnEscape);
      document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
    };
  }, [menuOpen]);
  const [playerNotification, setPlayerNotification] = useState<string | null>(
    null,
  );
  const previousChatCountRef = useRef(gameState.chat?.length ?? 0);

  useEffect(() => {
    document.documentElement.dataset.platformTheme = platformTheme;
    localStorage.setItem('platform-theme', platformTheme);
  }, [platformTheme]);
  const localPlayer = spectator
    ? undefined
    : gameState.players.find((p) => p.socketId === socket.id);
  const cardSelectedRef = useRef(false);
  const notificationTimerRef = useRef<number | null>(null);

  function showPlayerNotification(message: string) {
    setPlayerNotification(message);

    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = window.setTimeout(() => {
      setPlayerNotification(null);
      notificationTimerRef.current = null;
    }, 2200);
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(gameState.roomCode);
      setRoomCodeCopied(true);
      window.setTimeout(() => setRoomCodeCopied(false), 1600);
    } catch {
      setRoomCodeCopied(false);
    }
  }

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current !== null) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMenuShortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.key.toLowerCase() !== 'm') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      setMenuOpen((open) => !open);
    };

    window.addEventListener('keydown', onMenuShortcut);
    return () => window.removeEventListener('keydown', onMenuShortcut);
  }, []);

  useEffect(() => {
    const onMobileChatShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'c' && event.code !== 'KeyC') return;
      if (window.innerWidth > 1024 || mobileChatOpen) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      ) {
        return;
      }

      event.preventDefault();
      setMobileChatOpen(true);
    };

    window.addEventListener('keydown', onMobileChatShortcut);
    return () => window.removeEventListener('keydown', onMobileChatShortcut);
  }, [mobileChatOpen]);

  useEffect(() => {
    const messageCount = gameState.chat?.length ?? 0;
    const hasNewMessage = messageCount > previousChatCountRef.current;
    previousChatCountRef.current = messageCount;

    if (hasNewMessage && window.innerWidth <= 1024) {
      setMobileChatOpen(true);
    }
  }, [gameState.chat?.length]);

  // Keep the same seat map as a regular player. For spectators, the last
  // participant occupies the local seat visually, while remaining passive.
  const layoutLocalPlayer = spectator
    ? gameState.players[gameState.players.length - 1]
    : localPlayer;
  const totalPlayers = gameState.players.length;
  const localIndex = layoutLocalPlayer
    ? gameState.players.findIndex(
        (player) => player.id === layoutLocalPlayer.id,
      )
    : -1;
  const opponents =
    localIndex >= 0
      ? Array.from(
          { length: totalPlayers - 1 },
          (_, index) =>
            gameState.players[(localIndex + index + 1) % totalPlayers],
        )
      : gameState.players;
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer?.socketId === socket.id;
  const showPlayerBoards = gameId !== 'exploding-kittens';
  const showPhases = gameId !== 'exploding-kittens';

  useEffect(() => {
    if (gameId === 'exploding-kittens' || !autoEnabled || !isActivePlayer)
      return;
    if (gameState.pendingAction || gameState.pendingPlay) return;

    const canAutoAdvance =
      gameState.phase === 'END' ||
      (gameState.phase === 'ACTION' && gameState.actionUsed);

    if (!canAutoAdvance) return;

    const timer = setTimeout(() => {
      socket.emit('next-phase', gameState.roomCode);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    autoEnabled,
    isActivePlayer,
    gameState.phase,
    gameState.actionUsed,
    gameState.pendingAction,
    gameState.pendingPlay,
    gameState.roomCode,
    gameId,
  ]);

  type SeatPosition =
    | 'top'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right'
    | 'left'
    | 'right';
  const localSeatPosition: SeatPosition =
    totalPlayers === 6 ? 'bottom-left' : 'bottom';
  const positions: SeatPosition[] =
    totalPlayers <= 2
      ? ['top']
      : totalPlayers === 3
        ? ['left', 'top']
        : totalPlayers === 4
          ? ['left', 'top', 'right']
          : totalPlayers === 5
            ? ['left', 'top', 'top', 'right']
            : totalPlayers === 6
              ? ['left', 'top', 'top', 'right', 'bottom-right']
              : totalPlayers === 7
                ? ['left', 'top', 'top', 'top', 'right', 'bottom']
                : ['left', 'top', 'top', 'top', 'right', 'bottom', 'bottom'];
  const seatPositions = positions;
  const localPlayerId = localPlayer?.id ?? '';
  const neighSelectableIds = new Set(
    gameState.pendingPlay && neighSelectionActive
      ? (localPlayer?.hand ?? [])
        .filter((card) =>
          card.effect === 'neigh' ||
          card.effect === 'super_neigh' ||
          card.effect === 'neigh_thank_you' ||
          card.effect === 'hex_neigh',
        )
        .map((card) => card.uid)
      : [],
  );
  const llamacornAction = gameState.pendingAction?.type === 'llamacorn' &&
    gameState.pendingAction.remainingPlayerIds.includes(localPlayerId);
  const llamacornSelectableIds = llamacornAction
    ? new Set((localPlayer?.hand ?? []).map((card) => card.uid))
    : new Set<string>();
  const necromancerDiscardAction = gameState.pendingAction?.type === 'discard' &&
    gameState.pendingAction.reason === 'necromancer_unicorn' &&
    gameState.pendingAction.playerId === localPlayerId;
  const necromancerSelectableIds = necromancerDiscardAction
    ? new Set((localPlayer?.hand ?? [])
      .filter((card) => card.cardType === 'unicorn')
      .map((card) => card.uid))
    : new Set<string>();
  const rainbowAction = gameState.pendingAction?.type === 'select_own_hand_card' &&
    gameState.pendingAction.reason === 'rainbow_unicorn' &&
    gameState.pendingAction.playerId === localPlayerId;
  const rainbowSelectableIds = rainbowAction
    ? new Set((localPlayer?.hand ?? [])
      .filter((card) => card.cardType === 'unicorn' && card.unicornClass === 'basic')
      .map((card) => card.uid))
    : new Set<string>();
  const mermaidAction = gameState.pendingAction &&
    'reason' in gameState.pendingAction &&
    gameState.pendingAction.reason === 'mermaid_unicorn' &&
    ((gameState.pendingAction.type === 'select_player' &&
      gameState.pendingAction.sourcePlayerId === localPlayerId) ||
      (gameState.pendingAction.type === 'select_stable_card' &&
        gameState.pendingAction.sourcePlayerId === localPlayerId));
  const mermaidTargets = new Map<string, string>();
  if (mermaidAction) {
    gameState.players.forEach((player) => {
      if (player.id === localPlayerId) return;
      if (
        gameState.pendingAction?.type === 'select_stable_card' &&
        !gameState.pendingAction.remainingPlayerIds?.includes(player.id)
      ) return;
      [...player.stable, ...player.upgrades, ...player.downgrades].forEach((card) => {
        mermaidTargets.set(card.uid, player.id);
      });
    });
  }
  const mermaidTargetIds = new Set(mermaidTargets.keys());
  const alluringAction = gameState.pendingAction?.type === 'alluring_narwhal' &&
    gameState.pendingAction.confirmed === true &&
    gameState.pendingAction.playerId === localPlayerId;
  const americornAction = gameState.pendingAction?.type === 'select_hand_card' &&
    gameState.pendingAction.reason === 'americorn' &&
    gameState.pendingAction.confirmed === true &&
    gameState.pendingAction.sourcePlayerId === localPlayerId;
  const annoyingDiscardAction = gameState.pendingAction?.type === 'discard' &&
    gameState.pendingAction.reason === 'annoying_flying_unicorn' &&
    gameState.pendingAction.playerId === localPlayerId;
  const annoyingDiscardSelectableIds = annoyingDiscardAction
    ? new Set((localPlayer?.hand ?? []).map((card) => card.uid))
    : new Set<string>();
  const alluringUpgradeCards = alluringAction
    ? gameState.players
      .filter((player) => player.id !== localPlayerId)
      .flatMap((player) => [
        ...player.upgrades,
        ...player.stable.filter((card) => card.cardType === 'upgrade'),
      ])
    : [];
  const alluringUpgradeIds = new Set(alluringUpgradeCards.map((card) => card.uid));
  const chainsawAction = gameState.pendingAction?.type === 'select_stable_card' &&
    gameState.pendingAction.reason === 'chainsaw_unicorn' &&
    gameState.pendingAction.sourcePlayerId === localPlayerId;
  const chainsawTargets = new Map<string, string>();
  if (chainsawAction) {
    gameState.players.forEach((player) => {
      if (player.id !== localPlayerId) {
        player.upgrades.forEach((card) => {
          if (card.id !== 'saved_by_the_sigil') {
            chainsawTargets.set(card.uid, JSON.stringify({
              cardId: card.uid,
              targetPlayerId: player.id,
              type: 'upgrade',
            }));
          }
        });
      } else {
        player.downgrades.forEach((card) => {
          chainsawTargets.set(card.uid, JSON.stringify({
            cardId: card.uid,
            targetPlayerId: player.id,
            type: 'downgrade',
          }));
        });
      }
    });
  }
  const chainsawTargetIds = new Set(chainsawTargets.keys());
  const darkAngelAction = gameState.pendingAction?.type === 'select_stable_card' &&
    gameState.pendingAction.reason === 'dark_angel_unicorn' &&
    gameState.pendingAction.sourcePlayerId === localPlayerId;
  const darkAngelTargets = darkAngelAction
    ? new Set((localPlayer?.stable ?? [])
      .filter((card) =>
        card.cardType === 'unicorn' &&
        !(localPlayer?.downgrades.some((downgrade) => downgrade.id === 'pandamonium') ?? false),
      )
      .map((card) => card.uid))
    : new Set<string>();
  const extremelyDestructiveAction = gameState.pendingAction?.type === 'extremely_destructive_unicorn' &&
    gameState.pendingAction.remainingPlayerIds.includes(localPlayerId) &&
    !gameState.pendingAction.resolvedPlayerIds.includes(localPlayerId);
  const extremelyDestructiveTargets = extremelyDestructiveAction
    ? new Set((localPlayer?.stable ?? [])
      .filter((card) =>
        card.cardType === 'unicorn' &&
        !(localPlayer?.downgrades.some((downgrade) => downgrade.id === 'pandamonium') ?? false),
      )
      .map((card) => card.uid))
    : new Set<string>();
  const selectedChainsawCard = selectedChainsawCardId
    ? gameState.players.flatMap((player) => [
        ...player.upgrades,
        ...player.downgrades,
      ]).find((card) => card.uid === selectedChainsawCardId)
    : undefined;
  const selectedAlluringUpgrade = alluringUpgradeCards.find(
    (card) => card.uid === selectedAlluringUpgradeId,
  );

  useEffect(() => {
    if (!alluringAction) setSelectedAlluringUpgradeId(null);
    if (!chainsawAction) setSelectedChainsawCardId(null);
    if (!darkAngelAction) setSelectedDarkAngelCardId(null);
    if (!extremelyDestructiveAction) setSelectedExtremelyDestructiveCardId(null);
    if (!mermaidAction) setSelectedMermaidCardId(null);
    if (!necromancerDiscardAction) setSelectedNecromancerCardIds(new Set());
    if (!necromancerDiscardAction) setSelectedNecromancerCardId(null);
  }, [alluringAction, chainsawAction, darkAngelAction, extremelyDestructiveAction, mermaidAction, necromancerDiscardAction]);

  useEffect(() => {
    if (!alluringAction || !selectedAlluringUpgrade) return;

    const onAlluringConfirmHotkey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key === '1') {
        event.preventDefault();
        setSelectedAlluringUpgradeId(null);
      } else if (event.key === '2') {
        event.preventDefault();
        socket.emit('select-stable-card', {
          roomCode: gameState.roomCode,
          cardId: selectedAlluringUpgrade.uid,
        });
        setSelectedAlluringUpgradeId(null);
      }
    };

    window.addEventListener('keydown', onAlluringConfirmHotkey);
    return () => window.removeEventListener('keydown', onAlluringConfirmHotkey);
  }, [alluringAction, gameState.roomCode, selectedAlluringUpgrade]);

  const renderOpponent = (opp: (typeof opponents)[number]) => (
    <div
      key={opp.id}
      data-player-id={opp.id}
      className="player-slot flex-col items-center gap-2"
    >
      <PlayerInfo
        player={opp}
        isActive={opp.id === activePlayer.id}
        status={getPlayerStatus(gameState, opp.id, gameId)}
        localPlayerId={localPlayerId}
        gameId={gameId}
        turnsRemaining={
          opp.id === activePlayer.id ? gameState.turnsRemaining : 0
        }
        isHost={isHost}
        roomCode={gameState.roomCode}
        handCount={opp.id === animatedHandPlayerId ? animatedHandCount : undefined}
      />
      {showPlayerBoards && (
        <PlayerBoard
          player={opp}
          isLocalPlayer={false}
          isMyTurn={opp.id === activePlayer.id}
            selectableUpgradeIds={alluringAction ? alluringUpgradeIds : chainsawAction ? chainsawTargetIds : darkAngelAction && opp.id === localPlayerId ? darkAngelTargets : mermaidAction ? mermaidTargetIds : undefined}
           selectedUpgradeId={selectedAlluringUpgradeId ?? undefined}
           onUpgradeSelect={(cardId) => {
              if (chainsawAction) {
                setSelectedChainsawCardId(cardId);
              } else if (darkAngelAction) {
                setSelectedDarkAngelCardId(cardId);
              } else if (mermaidAction) {
                const targetPlayerId = mermaidTargets.get(cardId);
                if (targetPlayerId) {
                  setSelectedMermaidCardId(cardId);
                }
              } else {
               setSelectedAlluringUpgradeId(cardId);
             }
           }}
        />
      )}
    </div>
  );

  const queenBeeOwner = gameState.players.find((p) =>
    p.stable.some((c) => c.id === 'queen_bee_unicorn'),
  );

  const queenBeeOwnerId =
    queenBeeOwner &&
    !queenBeeOwner.downgrades.some((c) => c.id === 'blinding_light')
      ? queenBeeOwner.id
      : undefined;

  const blockedBasicUnicornIds = new Set(
    queenBeeOwnerId !== undefined && queenBeeOwnerId !== localPlayer?.id
      ? (localPlayer?.hand ?? [])
          .filter((c) => c.cardType === 'unicorn' && c.unicornClass === 'basic')
          .map((c) => c.uid)
      : [],
  );

  const hasBrokenStable =
    localPlayer?.downgrades.some((c) => c.id === 'broken_stable') ?? false;

  const blockedUpgradeIds = hasBrokenStable
    ? new Set(
        (localPlayer?.hand ?? [])
          .filter((c) => c.cardType === 'upgrade')
          .map((c) => c.uid),
      )
    : new Set<string>();

  const blockedCardIds = new Set<string>([
    ...blockedBasicUnicornIds,
    ...blockedUpgradeIds,
  ]);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }

      if (e.isComposing) return;
      if (interactionsDisabled) return;
      if (e.code !== 'Space') return;

      const canDraw =
        isMyTurn &&
        (gameState.phase === 'DRAW' || gameState.phase === 'ACTION') &&
        !gameState.actionUsed &&
        !gameState.pendingAction &&
        !gameState.pendingPlay &&
        (gameState.actionPlaysRemaining === undefined ||
          gameState.actionPlaysRemaining === 2);

      if (!canDraw || cardSelectedRef.current) return;

      e.preventDefault();
      socket.emit('draw-action-card', {
        roomCode: gameState.roomCode,
        playerId: localPlayerId,
      });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMyTurn, gameState, interactionsDisabled, localPlayerId]);

  if (!localPlayer && !spectator) return null;
  const winner = gameState.winnerId
    ? (gameState.players.find((player) => player.id === gameState.winnerId) ??
      (gameState.winnerName ? { name: gameState.winnerName } : undefined))
    : undefined;

  return (
    <div
      className={`board-layout players-${Math.min(totalPlayers, 8)} ${gameId === 'exploding-kittens' ? 'game-exploding-kittens' : ''}`}
    >
      {interactionsDisabled && (
        <div
          className="fixed inset-0 z-[70] cursor-wait"
          aria-label="Repartiendo cartas"
          role="status"
        />
      )}
      <div className="game-area">
        <div className="player-top">
          {opponents
            .filter((opp) =>
              ['top', 'top-left', 'top-right'].includes(
                seatPositions[opponents.indexOf(opp)],
              ),
            )
            .map(renderOpponent)}
        </div>

        <div className="middle">
          <div className="turn-order-side">
            <TurnOrder gameState={gameState} localPlayerId={localPlayerId} />
          </div>

          <div className="player-side player-side-left">
            {opponents
              .filter((opp) => seatPositions[opponents.indexOf(opp)] === 'left')
              .map(renderOpponent)}
          </div>

          <div className="player-side player-side-right">
            {opponents
              .filter(
                (opp) => seatPositions[opponents.indexOf(opp)] === 'right',
              )
              .map(renderOpponent)}
          </div>

          <div className="center-wrap">
            <div className="center">
              <div className="center-column" data-center-area>
                <div className="center-stack">
                  <CenterArea
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                    localPlayerId={localPlayerId}
                    gameId={gameId}
                  />

                  {alluringAction && (
                    <span className="draw-hint">
                      Selecciona un Upgrade para robar
                    </span>
                  )}

                  {americornAction && (
                    <span className="draw-hint">
                      Selecciona una carta del abanico para robarla de la mano
                    </span>
                  )}

                  {chainsawAction && (
                    <span className="draw-hint">
                      Selecciona un Upgrade rival o un Downgrade de tu establo
                    </span>
                  )}

                  {darkAngelAction && (
                    <span className="draw-hint">
                      Selecciona un unicornio de tu establo para sacrificar
                    </span>
                  )}

                  {extremelyDestructiveAction && (
                    <span className="draw-hint">
                      Selecciona un unicornio de tu establo para sacrificar
                    </span>
                  )}

                  {annoyingDiscardAction && (
                    <span className="draw-hint">
                      Descarta una carta de tu mano
                    </span>
                  )}

                  {neighSelectionActive && (
                    <span className="draw-hint">
                      Selecciona la carta Neigh a utilizar
                    </span>
                  )}

                  {llamacornAction && (
                    <span className="draw-hint">
                      Selecciona la carta a descartar
                    </span>
                  )}

                  {mermaidAction && (
                    <span className="draw-hint">
                      Selecciona una carta de cada establo oponente para regresarla a su mano
                    </span>
                  )}

                  {necromancerDiscardAction && (
                    <span className="draw-hint">
                      Descarta cartas de Unicornio ({gameState.pendingAction?.type === 'discard' ? gameState.pendingAction.cardsToDiscard : 0} pendientes)
                    </span>
                  )}

                  {rainbowAction && (
                    <span className="draw-hint">
                      Selecciona un Unicornio básico de tu mano para traerlo a tu establo
                    </span>
                  )}

                  {showPhases && isMyTurn && gameState.phase === 'DRAW' && (
                    <span className="draw-hint">
                      Presiona <kbd className="space-key">Space</kbd> para robar
                      una carta
                    </span>
                  )}

                  {gameId === 'exploding-kittens' &&
                    isMyTurn &&
                    !gameState.pendingAction &&
                    !gameState.pendingPlay && (
                      <span className="draw-hint">
                        Presiona <kbd className="space-key">Space</kbd> para
                        robar una carta y terminar tu turno
                      </span>
                    )}

                  {showPhases &&
                    isMyTurn &&
                    gameState.phase === 'ACTION' &&
                    !gameState.actionUsed &&
                    !gameState.pendingPlay &&
                    !americornAction &&
                     !chainsawAction &&
                     !darkAngelAction &&
                     !extremelyDestructiveAction &&
                    !annoyingDiscardAction && (
                      <span className="draw-hint">
                        Juega una carta o presiona{' '}
                        <kbd className="space-key">Space</kbd> para robar
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="chat-side">
            <Chat gameState={gameState} />
          </div>
        </div>

        <div className="player-bottom-right">
          {opponents
            .filter(
              (opp) => seatPositions[opponents.indexOf(opp)] === 'bottom-right',
            )
            .map(renderOpponent)}
        </div>

        <div className="player-bottom">
          {layoutLocalPlayer && (
            <div
              className={`player-slot local-player-slot ${localSeatPosition} flex-col items-center gap-2`}
              data-player-id={layoutLocalPlayer.id}
            >
              {playerNotification && (
                <PlayerNotification message={playerNotification} />
              )}

              <PlayerInfo
                player={layoutLocalPlayer}
                isActive={layoutLocalPlayer.id === activePlayer?.id}
                status={getPlayerStatus(
                  gameState,
                  layoutLocalPlayer.id,
                  gameId,
                )}
                localPlayerId={localPlayerId}
                gameId={gameId}
                turnsRemaining={
                  layoutLocalPlayer.id === activePlayer?.id
                    ? gameState.turnsRemaining
                    : 0
                }
                isHost={isHost}
                roomCode={gameState.roomCode}
                handCount={layoutLocalPlayer.id === animatedHandPlayerId ? animatedHandCount : undefined}
              />

              {showPlayerBoards && (
                <PlayerBoard
                  player={layoutLocalPlayer}
                  isLocalPlayer={!spectator}
                  isMyTurn={
                    layoutLocalPlayer.id === activePlayer?.id && !spectator
                  }
                    selectableUpgradeIds={chainsawAction ? chainsawTargetIds : darkAngelAction ? darkAngelTargets : extremelyDestructiveAction ? extremelyDestructiveTargets : undefined}
                    selectedUpgradeId={undefined}
                    onUpgradeSelect={(cardId) => {
                      if (chainsawAction && chainsawTargets.has(cardId)) setSelectedChainsawCardId(cardId);
                      if (darkAngelAction && darkAngelTargets.has(cardId)) setSelectedDarkAngelCardId(cardId);
                      if (extremelyDestructiveAction && extremelyDestructiveTargets.has(cardId)) setSelectedExtremelyDestructiveCardId(cardId);
                    }}
                />
              )}
            </div>
          )}

          {opponents.map((opp) => {
            const position = seatPositions[opponents.indexOf(opp)];
            if (position !== 'bottom') return null;
            return renderOpponent(opp);
          })}
        </div>
      </div>

      {alluringAction && selectedAlluringUpgrade && (
        <div
          className="overlay-backdrop"
          onClick={() => setSelectedAlluringUpgradeId(null)}
        >
          <div
            className="card-selection-window compact"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>✨ Alluring Narwhal</h2>
            <p>Confirma el Upgrade que deseas robar</p>
            <div className="selection-card-content alluring-selected-card-content">
              <PlayingCard
                name={selectedAlluringUpgrade.name}
                image={selectedAlluringUpgrade.image}
                size="large"
              />
              <div className="selection-card-title">{selectedAlluringUpgrade.name}</div>
            </div>
            <div className="selection-buttons">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setSelectedAlluringUpgradeId(null)}
              >
                <span className="button-hotkey" aria-hidden="true">1 </span>
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-button"
                onClick={() => {
                  socket.emit('select-stable-card', {
                    roomCode: gameState.roomCode,
                    cardId: selectedAlluringUpgrade.uid,
                  });
                  setSelectedAlluringUpgradeId(null);
                }}
              >
                <span className="button-hotkey" aria-hidden="true">2 </span>
                Robar
              </button>
            </div>
          </div>
        </div>
      )}

      {chainsawAction && selectedChainsawCard && (
        <CardSelectionOverlay
          hide={false}
          title="🪚 Chainsaw Unicorn"
          subtitle={`¿Deseas seleccionar "${selectedChainsawCard.name}" para resolver el efecto?`}
          items={[{
            id: selectedChainsawCard.uid,
            value: selectedChainsawCard.uid,
            title: selectedChainsawCard.name,
            image: selectedChainsawCard.image,
          }]}
          maxSelection={1}
          confirmText="Confirmar"
          showSelection={false}
          compact
          keyboardNavigation={false}
          buttonHotkeys
          onConfirm={() => {
            const target = chainsawTargets.get(selectedChainsawCard.uid);
            if (!target) return;
            setSelectedChainsawCardId(null);
            socket.emit('select-stable-card', {
              roomCode: gameState.roomCode,
              cardId: target,
            });
          }}
          onCancel={() => setSelectedChainsawCardId(null)}
        />
      )}

      {darkAngelAction && selectedDarkAngelCardId && (() => {
        const card = localPlayer?.stable.find((item) => item.uid === selectedDarkAngelCardId);
        if (!card) return null;
        return (
          <CardSelectionOverlay
            hide={false}
            title="😈 Dark Angel Unicorn"
            subtitle={`¿Deseas sacrificar "${card.name}" para resolver el efecto?`}
            items={[{ id: card.uid, value: card.uid, title: card.name, image: card.image }]}
            maxSelection={1}
            confirmText="Sacrificar"
            showSelection={false}
            compact
            keyboardNavigation={false}
            buttonHotkeys
            onConfirm={() => {
              setSelectedDarkAngelCardId(null);
              socket.emit('select-stable-card', { roomCode: gameState.roomCode, cardId: card.uid });
            }}
            onCancel={() => setSelectedDarkAngelCardId(null)}
          />
        );
      })()}

      {extremelyDestructiveAction && selectedExtremelyDestructiveCardId && (() => {
        const card = localPlayer?.stable.find((item) => item.uid === selectedExtremelyDestructiveCardId);
        if (!card) return null;
        return (
          <CardSelectionOverlay
            hide={false}
            title="💥 Extremely Destructive Unicorn"
            subtitle={`¿Deseas sacrificar "${card.name}" para resolver el efecto?`}
            items={[{ id: card.uid, value: card.uid, title: card.name, image: card.image }]}
            maxSelection={1}
            confirmText="Sacrificar"
            showSelection={false}
            compact
            keyboardNavigation={false}
            buttonHotkeys
            onConfirm={() => {
              setSelectedExtremelyDestructiveCardId(null);
              socket.emit('select-stable-card', { roomCode: gameState.roomCode, cardId: card.uid });
            }}
            onCancel={() => setSelectedExtremelyDestructiveCardId(null)}
          />
        );
      })()}

      {necromancerDiscardAction && selectedNecromancerCardId && (() => {
        const card = localPlayer?.hand.find((item) => item.uid === selectedNecromancerCardId);
        if (!card) return null;
        return (
          <CardSelectionOverlay
            hide={false}
            title="🧙 Necromancer Unicorn"
            subtitle="¿Deseas descartar esta carta de Unicornio?"
            items={[{ id: card.uid, value: card.uid, title: card.name, image: card.image }]}
            maxSelection={1}
            confirmText="Descartar"
            showSelection={false}
            compact
            keyboardNavigation={false}
            buttonHotkeys
            onConfirm={() => {
              setSelectedNecromancerCardId(null);
              setSelectedNecromancerCardIds(new Set());
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds: [card.uid],
              });
            }}
            onCancel={() => setSelectedNecromancerCardId(null)}
          />
        );
      })()}

      {rainbowAction && selectedRainbowCardId && (() => {
        const card = localPlayer?.hand.find((item) => item.uid === selectedRainbowCardId);
        if (!card) return null;
        return (
          <CardSelectionOverlay
            hide={false}
            title="Rainbow Unicorn"
            subtitle={`¿Deseas traer "${card.name}" de tu mano a tu establo?`}
            items={[{ id: card.uid, value: card.uid, title: card.name, image: card.image }]}
            maxSelection={1}
            confirmText="Traer al establo"
            showSelection={false}
            compact
            keyboardNavigation={false}
            buttonHotkeys
            onConfirm={() => {
              setSelectedRainbowCardId(null);
              socket.emit('select-own-hand-card', {
                roomCode: gameState.roomCode,
                cardId: card.uid,
              });
            }}
            onCancel={() => setSelectedRainbowCardId(null)}
          />
        );
      })()}

      {mermaidAction && selectedMermaidCardId && (() => {
        const card = gameState.players
          .flatMap((player) => [...player.stable, ...player.upgrades, ...player.downgrades])
          .find((item) => item.uid === selectedMermaidCardId);
        const targetPlayerId = mermaidTargets.get(selectedMermaidCardId);
        if (!card || !targetPlayerId) return null;
        return (
          <CardSelectionOverlay
            hide={false}
            title="🧜‍♀️ Mermaid Unicorn"
            subtitle={`¿Deseas devolver "${card.name}" a la mano de su dueño?`}
            items={[{ id: card.uid, value: card.uid, title: card.name, image: card.image }]}
            maxSelection={1}
            confirmText="Devolver"
            showSelection={false}
            compact
            keyboardNavigation={false}
            buttonHotkeys
            onConfirm={() => {
              setSelectedMermaidCardId(null);
              socket.emit('select-player', {
                roomCode: gameState.roomCode,
                playerId: targetPlayerId,
                cardId: card.uid,
              });
            }}
            onCancel={() => setSelectedMermaidCardId(null)}
          />
        );
      })()}

      {spectator && winner && (
        <div className="spectator-result" role="status">
          <span>Partida terminada</span>
          <strong>{winner.name} ganó</strong>
        </div>
      )}

      {(!spectator || gameState.pendingAction?.type === 'exploding_kitten') && (
        <GameOverlay
          gameState={gameState}
          localPlayerId={spectator ? '' : localPlayerId}
          hide={hidePendingPlay && gameState.pendingAction?.type !== 'llamacorn' &&
            gameState.pendingAction?.type !== 'mystical_vortex' &&
            !(gameState.pendingAction?.type === 'select_choice' &&
              gameState.pendingAction.reason === 'neigh_thank_you')}
        />
      )}

      <PendingPlayOverlay
        gameState={gameState}
        localPlayerId={spectator ? '' : localPlayerId}
        gameId={gameId}
        hide={hidePendingPlay && gameState.pendingAction?.type !== 'llamacorn'}
        spectator={spectator}
        neighSelectionActive={neighSelectionActive}
        onNeighSelectionChange={setNeighSelectionActive}
      />

      <NeighRevealOverlay gameState={gameState} />

      <button
        ref={menuToggleRef}
        className="game-menu-toggle"
        type="button"
        title="Abrir menú de partida"
        aria-label="Abrir menú de partida"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      <aside
        ref={menuRef}
        className={`corner-controls game-menu-panel${menuOpen ? ' is-open' : ''}`}
      >
        <div className="game-menu-header">
          <span>Menú de partida</span>
        </div>
        {!spectator && (
          <button
            className="room-code-display"
            title="Copiar código de sala"
            onClick={copyRoomCode}
          >
            <span className="room-code-label">Sala</span>
            <strong>{gameState.roomCode}</strong>
            {roomCodeCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}

        {gameId !== 'exploding-kittens' && (
          <button
            className={`ctrl-button ctrl-neutral${autoEnabled ? ' auto-on' : ''}`}
            title={
              autoEnabled
                ? 'Desactivar modo automático'
                : 'Activar modo automático'
            }
            onClick={() => setAutoEnabled((v) => !v)}
          >
            <Bot size={16} />
            <span>Modo automático</span>
          </button>
        )}

        {isHost && (
          <button
            className={`ctrl-button ctrl-neutral${
              gameState.debugMode ? ' auto-on' : ''
            }`}
            title={
              gameState.debugMode
                ? 'Desactivar modo debug'
                : 'Activar modo debug (elegir carta del mazo en la fase de robo)'
            }
            onClick={() => socket.emit('toggle-debug-mode', gameState.roomCode)}
          >
            <Bug size={16} />
            <span>Modo debug</span>
          </button>
        )}

        <button
          type="button"
          className="ctrl-button ctrl-neutral"
          title="Controles"
          onClick={() => {
            setMenuOpen(false);
            setControlsOpen(true);
          }}
        >
          <Keyboard size={16} />
          <span>Controles</span>
        </button>

        <button
          type="button"
          className="ctrl-button ctrl-neutral"
          title="Opciones"
          onClick={() => {
            setMenuOpen(false);
            setPendingTheme(platformTheme);
            setOptionsOpen(true);
          }}
        >
          <SettingsIcon size={16} />
          <span>Opciones</span>
        </button>

        {isHost && (
          <button
            className="ctrl-button ctrl-reset"
            title="Reiniciar partida"
            onClick={() => {
              socket.emit('restart-game', gameState.roomCode);
            }}
          >
            <RotateCcw size={16} />
            <span>Reiniciar partida</span>
          </button>
        )}

        <button
          className="ctrl-button ctrl-leave"
          title="Salir de la partida"
          onClick={() => {
            setMenuOpen(false);
            setLeaveOpen(true);
          }}
        >
          <LogOut size={16} />
          <span>Salir de la partida</span>
        </button>
      </aside>

      {optionsOpen && (
        <div
          className="platform-options-backdrop"
          onClick={() => setOptionsOpen(false)}
        >
          <section
            className="platform-options-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-options-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="platform-options-header">
              <div>
                <span className="platform-options-kicker">Personalización</span>
                <h2 id="platform-options-title">Opciones</h2>
              </div>
              <button
                type="button"
                className="platform-options-close"
                aria-label="Cerrar opciones"
                onClick={() => setOptionsOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="platform-options-section">
              <label
                className="platform-theme-row"
                htmlFor="platform-theme-select"
              >
                <span className="platform-options-label">
                  Tema de la plataforma
                </span>
                <div className="platform-theme-combobox">
                  <button
                    id="platform-theme-select"
                    type="button"
                    className="platform-theme-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={themeMenuOpen}
                    onClick={() => setThemeMenuOpen((open) => !open)}
                  >
                    <span className="platform-theme-trigger-swatch">
                      {PLATFORM_THEMES.find(
                        (theme) => theme.id === pendingTheme,
                      )?.colors.map((color) => (
                        <span key={color} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <span>
                      {
                        PLATFORM_THEMES.find(
                          (theme) => theme.id === pendingTheme,
                        )?.name
                      }
                    </span>
                    <span className="platform-theme-chevron">⌄</span>
                  </button>
                  {themeMenuOpen && (
                    <div
                      className="platform-theme-menu"
                      role="listbox"
                      aria-label="Temas disponibles"
                    >
                      {PLATFORM_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          role="option"
                          aria-selected={pendingTheme === theme.id}
                          className={`platform-theme-menu-option${pendingTheme === theme.id ? ' is-selected' : ''}`}
                          onClick={() => {
                            setPendingTheme(theme.id);
                            setThemeMenuOpen(false);
                          }}
                        >
                          <span className="platform-theme-trigger-swatch">
                            {theme.colors.map((color) => (
                              <span
                                key={color}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </span>
                          <span className="platform-theme-menu-copy">
                            <strong>{theme.name}</strong>
                            <small>{theme.description}</small>
                          </span>
                          {pendingTheme === theme.id && (
                            <span className="platform-theme-check">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <button
                type="button"
                className="platform-options-apply"
                onClick={() => {
                  setPlatformTheme(pendingTheme);
                  setOptionsOpen(false);
                }}
              >
                Aplicar cambios
              </button>
            </div>
          </section>
        </div>
      )}

      {controlsOpen && <ControlsOverlay onClose={() => setControlsOpen(false)} />}

      {leaveOpen && (
        <LeaveConfirm
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => {
            if (onLeaveLobby) {
              onLeaveLobby();
            } else {
              socket.emit('leave-game', { roomCode: gameState.roomCode });
              navigate('/lobby');
            }
            setMobileChatOpen(false);
          }}
        />
      )}

      <button
        className="mobile-chat-toggle"
        title="Chat"
        onClick={() => setMobileChatOpen((v) => !v)}
      >
        <MessageSquare size={18} />
      </button>

      {mobileChatOpen && (
        <div className="mobile-chat-panel">
          <div className="mobile-chat-panel-inner">
            <Chat
              gameState={gameState}
              initialOpen
              onClose={() => setMobileChatOpen(false)}
            />
          </div>
        </div>
      )}

      {!spectator &&
        (showPhases ||
          gameId === 'exploding-kittens' ||
          gameId === 'exploding_kittens' ||
          gameId === 'explodingKittens') && (
          <>
            <div className="phase-panel-anchor">
              <PhasePanel gameState={gameState} showRoundPhase={showPhases} />
            </div>

            {showPhases && (
              <div className="phase-action-anchor">
                <PhaseActionButton
                  gameState={gameState}
                  autoEnabled={autoEnabled}
                />
              </div>
            )}
          </>
        )}

      {!spectator && (
        <div className="bottom-hand" data-hand>
          <PlayerHand
            player={localHandOverride
              ? { ...localPlayer!, hand: localHandOverride }
              : hiddenHandCardIds?.size
              ? {
                  ...localPlayer!,
                  hand: localPlayer!.hand.filter((card) => !hiddenHandCardIds.has(card.uid)),
                }
              : localPlayer!}
            isLocalPlayer
            isMyTurn={isMyTurn}
            gamePhase={showPhases ? gameState.phase : 'ACTION'}
            actionUsed={gameState.actionUsed}
            pendingPlay={!!gameState.pendingPlay}
            blockedCardIds={blockedCardIds}
            onPlay={onPlay}
            onPlayCards={(cardIds) => onPlay(cardIds[0], cardIds)}
            compact={
              gameId === 'exploding-kittens' ||
              gameId === 'exploding_kittens' ||
              gameId === 'explodingKittens'
            }
            gameId={gameId}
            sortHandMode={sortHandMode}
             discardSelection={annoyingDiscardAction}
             selectionOnly={neighSelectionActive || llamacornAction || necromancerDiscardAction || rainbowAction}
              selectableCardIds={rainbowAction ? rainbowSelectableIds : annoyingDiscardAction ? annoyingDiscardSelectableIds : llamacornAction ? llamacornSelectableIds : necromancerDiscardAction ? necromancerSelectableIds : neighSelectableIds}
             selectedCardIds={rainbowAction && selectedRainbowCardId
               ? new Set([selectedRainbowCardId])
               : necromancerDiscardAction
                 ? selectedNecromancerCardIds
                 : undefined}
             onCardSelect={(cardId) => {
                if (rainbowAction) {
                  setSelectedRainbowCardId(cardId);
                } else if (annoyingDiscardAction) {
                  socket.emit('discard-cards', {
                    roomCode: gameState.roomCode,
                    playerId: localPlayerId,
                    cardIds: [cardId],
                  });
                } else if (necromancerDiscardAction) {
                 if (selectedNecromancerCardIds.has(cardId)) return;
                 setSelectedNecromancerCardId(cardId);
               } else if (llamacornAction) {
                 socket.emit('discard-cards', {
                   roomCode: gameState.roomCode,
                   playerId: localPlayerId,
                   cardIds: [cardId],
                 });
               } else {
                 setNeighSelectionActive(false);
                 socket.emit('play-neigh', {
                   roomCode: gameState.roomCode,
                   cardId,
                 });
               }
             }}
             onDiscardSelect={(cardId) => {
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds: [cardId],
              });
            }}
            onInvalidAction={showPlayerNotification}
            onSelectionChange={(selected) => {
              cardSelectedRef.current = selected;
            }}
          />
        </div>
      )}
    </div>
  );
}
