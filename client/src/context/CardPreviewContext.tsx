import { createContext, useContext, useState, type ReactNode } from 'react';

interface PreviewData {
  image: string;
  x: number;
  y: number;
}

interface ContextType {
  preview: PreviewData | null;
  showPreview(image: string, x: number, y: number): void;
  hidePreview(): void;
}

const CardPreviewContext = createContext<ContextType | null>(null);

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

export function useCardPreview() {
  const ctx = useContext(CardPreviewContext);

  if (!ctx) {
    throw new Error('CardPreviewProvider missing');
  }

  return ctx;
}
