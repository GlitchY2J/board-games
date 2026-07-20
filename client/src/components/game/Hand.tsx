import Card from './Card';

export default function Hand() {
  return (
    <div>
      <h2>Tu mano</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Card title="Carta 1" />
        <Card title="Carta 2" />
        <Card title="Carta 3" />
        <Card title="Carta 4" />
        <Card title="Carta 5" />
      </div>
    </div>
  );
}
