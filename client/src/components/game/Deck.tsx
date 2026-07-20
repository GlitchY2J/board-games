interface Props {
  remaining: number;
}

export default function Deck({ remaining }: Props) {
  return (
    <div>
      <h2>Mazo</h2>
      <h3>{remaining} cartas</h3>
    </div>
  );
}
