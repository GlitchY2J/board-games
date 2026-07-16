import type { ButtonHTMLAttributes } from 'react';

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
    primary: 'bg-blue-600 hover:bg-blue-500',
    secondary: 'bg-gray-700 hover:bg-slate-600',
    danger: 'bg-red-600 hover:bg-red-500',
  };

  return (
    <button
      {...props}
      className={[
        'rounded-xl',
        'font-semibold',
        'py-3',
        'px-6',
        'shadow-md',
        'transition-all',
        'duration-200',
        'hover:scale-105',
        'active:scale-95',
        fullWidth ? 'w-full' : 'w-48',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
