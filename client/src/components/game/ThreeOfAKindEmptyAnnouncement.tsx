import { useEffect } from 'react';
import type { ThreeOfAKindEmptyAnnouncement as Announcement } from '../../../../shared/types/SocketEvents';
import './ThreeOfAKindEmptyAnnouncement.css';

interface Props {
  announcement: Announcement;
  onDone(): void;
}

export default function ThreeOfAKindEmptyAnnouncement({ announcement, onDone }: Props) {
  const cardNames: Record<string, string> = {
    beard_cat: 'Beard Cat',
    cattermelon: 'Cattermelon',
    hairy_potato_cat: 'Hairy Potato Cat',
    rainbow_ralphing_cat: 'Rainbow-Ralphing Cat',
    tacocat: 'Tacocat',
    attack: 'Attack',
    defuse: 'Defuse',
    favor: 'Favor',
    nope: 'Nope',
    see_the_future: 'See the Future',
    shuffle: 'Shuffle',
    skip: 'Skip',
    targeted_attack: 'Targeted Attack',
    reverse: 'Reverse',
    feral_cat: 'Feral Cat',
    draw_from_the_bottom: 'Draw From The Bottom',
    alter_the_future: 'Alter The Future',
  };
  const cardName = cardNames[announcement.requestedCardType] ?? announcement.requestedCardType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="three-kind-empty-announcement" role="status" aria-live="polite">
      <strong>Three of a Kind</strong>
      <span>
        {announcement.targetPlayerName} no tiene {cardName}.
      </span>
    </div>
  );
}
