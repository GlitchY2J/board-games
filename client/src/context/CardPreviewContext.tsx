import { useState, type ReactNode } from 'react';
import { CardPreviewContext, type PreviewData } from './CardPreviewStore';

export function CardPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<PreviewData | null>(null);

  function showPreview(image: string, x: number, y: number) {
    setPreview({
      image,
      x,
      y,
    });
  }

  function hidePreview() {
    setPreview(null);
  }

  return (
    <CardPreviewContext.Provider
      value={{
        preview,
        showPreview,
        hidePreview,
      }}
    >
      {children}
    </CardPreviewContext.Provider>
  );
}

