'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <button className={'p-2 rounded-lg transition-colors hover:bg-surface-3 ' + (className || '')} aria-label="Ganti tema" />;
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
      className={'p-2 rounded-lg transition-colors hover:bg-surface-3 ' + (className || '')}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
