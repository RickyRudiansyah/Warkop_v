import { useState, useEffect } from 'react';

interface UseCountdownReturn {
  remaining: number;
  isOverdue: boolean;
  isWarning: boolean;
  isCritical: boolean;
  formatted: string;
  minutes: number;
  seconds: number;
}

export function useCountdown(estimatedReadyAt: string | null): UseCountdownReturn {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!estimatedReadyAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const target = new Date(estimatedReadyAt).getTime();
      if (isNaN(target)) { setRemaining(0); return; }
      const now = Date.now();
      setRemaining(Math.floor((target - now) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [estimatedReadyAt]);

  const absRemaining = Math.abs(remaining);
  const minutes = Math.floor(absRemaining / 60);
  const seconds = absRemaining % 60;

  return {
    remaining,
    isOverdue: remaining < 0,
    isWarning: remaining > 0 && remaining <= 180,
    isCritical: remaining < 0 && remaining <= -300,
    formatted: String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'),
    minutes,
    seconds,
  };
}
