interface CardProps {
  name: string;
  image: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function Card({
  name,
  image,
  onClick,
  disabled = false,
}: CardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform .15s',
      }}
    >
      <img
        src={image}
        alt={name}
        draggable={false}
        style={{ width: 170, borderRadius: 12, display: 'block' }}
      />
    </button>
  );
}
