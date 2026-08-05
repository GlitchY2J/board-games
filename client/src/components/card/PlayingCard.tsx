import { useCardPreview } from '../../context/CardPreviewContext';
import './PlayingCard.css';

interface Props {
  name: string;
  image: string;
  size?: 'small' | 'medium' | 'large';
  hidden?: boolean;
  disabled?: boolean;
  selected?: boolean;
  preview?: boolean;
  onClick?: () => void;
}

export default function PlayingCard({
  name,
  image,
  size = 'medium',
  hidden = false,
  disabled = false,
  selected = false,
  preview = true,
  onClick,
}: Props) {
  const { showPreview, hidePreview } = useCardPreview();

  const isCardBack = hidden || (image && image.includes('card_back'));
  const shouldShowPreview = preview && !isCardBack && !!image;

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (!shouldShowPreview) return;
    showPreview(image, e.clientX, e.clientY);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!shouldShowPreview) return;
    showPreview(image, e.clientX, e.clientY);
  }

  return (
    <img
      className={`playing-card ${size} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
      src={isCardBack ? '/cards/base/card_back.png' : image}
      alt={name}
      draggable={false}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={hidePreview}
    />
  );
}

