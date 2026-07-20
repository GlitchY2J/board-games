interface Props {
  count: number;
}

export default function DiscardPile({ count }: Props) {
  return (
    <div>
      <h2>Descarte</h2>
      <h3>{count} cartas</h3>
    </div>
  );
}
