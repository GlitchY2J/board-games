import { createContext } from 'react';

export interface PreviewData {
  image: string;
  x: number;
  y: number;
}

export interface CardPreviewContextType {
  preview: PreviewData | null;
  showPreview(image: string, x: number, y: number): void;
  hidePreview(): void;
}

export const CardPreviewContext = createContext<CardPreviewContextType | null>(null);
