import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl',
        'border',
        'border-slate-700',
        'bg-slate-800/70',
        'backdrop-blur-md',
        'shadow-xl',
        'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
