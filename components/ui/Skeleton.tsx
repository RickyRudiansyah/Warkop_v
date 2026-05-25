import { cn } from '@/lib/utils';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ variant = 'text', width, height, className, animation = 'pulse' }: SkeletonProps) {
  const base = 'inline-block bg-gray-200';
  const animations = {
    pulse: 'animate-pulse',
    wave: '',
    none: '',
  };

  const variants = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <span
      className={cn(base, variants[variant], animations[animation], className)}
      style={style}
    />
  );
}
