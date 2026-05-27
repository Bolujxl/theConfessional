import { useState, useEffect } from 'react';
import type { Confession } from '../types';

const VISIBLE_MS = 30_000;

export interface EphemeralConfession extends Confession {
  opacity: number;
  gone: boolean;
}

export function useEphemeral(confessions: Confession[]): EphemeralConfession[] {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  return confessions.map((c) => {
    const opacity = Math.max(0, 1 - (now - c.createdAt) / VISIBLE_MS);
    return { ...c, opacity, gone: opacity === 0 };
  });
}
