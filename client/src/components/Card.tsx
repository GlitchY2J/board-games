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
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <img
        src={image}
        alt={name}
        draggable={false}
        style={{ width: 160, borderRadius: 10, userSelect: 'none' }}
      />
    </button>
  );
}
