import './CardPreview.css';

import { useCardPreview } from '../../context/CardPreviewContext';

export default function CardPreview() {
  const { preview } = useCardPreview();

  if (!preview) return null;

  let left = preview.x + 20;
  let top = preview.y + 20;

  const width = 280;
  const height = 390;

  if (left + width > window.innerWidth) {
    left = preview.x - width - 20;
  }

  if (top + height > window.innerHeight) {
    top = preview.y - height - 20;
  }

  return (
    <img className="card-preview" src={preview.image} style={{ left, top }} />
  );
}
