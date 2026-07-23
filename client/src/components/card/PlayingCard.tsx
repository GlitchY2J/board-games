import './PlayingCard.css';

interface Props {
  name: string;
  image: string;
  size?: 'small' | 'medium' | 'large';
  hidden?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export default function PlayingCard({
  name,
  image,
  size = 'medium',
  hidden = false,
  disabled = false,
  onClick,
}: Props) {
  return (
    <img
      className={`playing-card ${size} ${disabled ? 'disabled' : ''} {selected ? "selected" : ""}`}
      src={hidden ? 'cards/base/card_back.png' : image}
      alt={name}
      draggable={false}
      onClick={disabled ? undefined : onClick}
    />
  );
}
