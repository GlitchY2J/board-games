import { useContext } from 'react';
import { CardPreviewContext } from './CardPreviewStore';

export function useCardPreview() {
  const ctx = useContext(CardPreviewContext);

  if (!ctx) {
    throw new Error('CardPreviewProvider missing');
  }

  return ctx;
}
