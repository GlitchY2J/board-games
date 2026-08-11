import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold glow-btn-emerald border border-emerald-400/20 shadow-emerald-500/20',
    secondary: 'bg-slate-900/50 backdrop-blur-md hover:bg-slate-800/80 text-slate-200 border border-slate-700/50 hover:border-slate-600 shadow-lg shadow-black/10',
    danger: 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold border border-rose-500/20 shadow-lg shadow-red-500/10 hover:shadow-red-500/20',
  };

  return (
    <button
      {...props}
      className={cn(
        'rounded-2xl',
        'tracking-wide',
        'text-sm',
        'py-3.5',
        'px-8',
        'transition-all',
        'duration-300',
        'ease-out',
        'hover:scale-[1.02]',
        'active:scale-[0.98]',
        'cursor-pointer',
        fullWidth ? 'w-full' : 'w-48',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
