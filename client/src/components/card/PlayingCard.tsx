import { useCardPreview } from '../../context/useCardPreview';
import './PlayingCard.css';

interface Props {
  name: string;
  image: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  hidden?: boolean;
  disabled?: boolean;
  selected?: boolean;
  preview?: boolean;
  plain?: boolean;
  backImage?: string;
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
  plain = false,
  backImage = '/cards/unstable-unicorns/base/card_back.png',
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
    <div
      className={`playing-card ${size} ${isCardBack ? 'card-back' : ''} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''} ${plain ? 'plain' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={hidePreview}
      onClick={disabled ? undefined : onClick}
    >
      <img
         src={isCardBack ? backImage : image}
        alt={name}
        draggable={false}
      />
    </div>
  );
}

