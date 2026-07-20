interface CardProps {
  title: string;
}

export default function Card({ title }: CardProps) {
  return (
    <div
      style={{
        width: 120,
        height: 180,
        background: '#252525',
        border: '2px solid #444',
        borderRadius: 12,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {title}
    </div>
  );
}
