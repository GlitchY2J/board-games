import { ButtonHTMLAttributes } from 'react';

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
  const base =
    'rounded-xl px-6 py-3 font-semibold transition-all duration-200 shadow-md';

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95',
    secondary: 'bg-gray-700 hover:bg-slate-600 hover:scale-105 active:scale-95',
    danger: 'bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95',
  };

  return (
    <button
      className={`%{base} ${variants[variant]} ${fullWidth ? 'w-full' : 'w-48'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
