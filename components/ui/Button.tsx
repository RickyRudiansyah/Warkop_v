import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dark' | 'outline-ember' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  
  const variants = {
    primary: 'bg-primary text-[color:var(--color-on-primary)] hover:bg-primary-light focus:ring-primary shadow-sm hover:shadow-md',
    secondary: 'bg-surface-3 text-text hover:bg-border focus:ring-primary',
    danger: 'bg-danger text-white hover:opacity-90 focus:ring-danger',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-3 focus:ring-primary',
    success: 'bg-success text-white hover:opacity-90 focus:ring-success',
    dark: 'bg-brown-950 text-on-dark hover:bg-brown-900 focus:ring-brown-900 shadow-sm',
    // DESIGN.md §5.6 — tombol ADD di kartu produk: outline ember, background transparan.
    'outline-ember': 'bg-transparent border-[1.5px] border-ember-600 text-ember-600 hover:bg-ember-100 focus:ring-ember-600',
    // DESIGN.md §5.8 — tombol aksi di cart bar coklat.
    gold: 'bg-gold-500 text-brown-900 hover:bg-gold-400 focus:ring-gold-500 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
