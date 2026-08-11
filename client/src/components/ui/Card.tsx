import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-3xl',
        'glass-panel',
        'p-8',
        'transition-all',
        'duration-500',
        className,
      )}
    >
      {children}
    </div>
  );
}
