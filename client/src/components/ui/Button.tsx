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
    primary: 'bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-400 hover:to-slate-600 text-slate-100 font-bold glow-btn-emerald border border-slate-400/20 shadow-slate-900/40',
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
        'disabled:opacity-60',
        'disabled:cursor-not-allowed',
        'disabled:hover:scale-100',
        'disabled:active:scale-100',
        'disabled:pointer-events-none',
        fullWidth ? 'w-full' : 'w-48',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
