import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatTimestamp } from '../lib/formatTimestamp';
import type { Confession } from '../types';

interface Props {
  confession: Confession;
  now: number;
}

const ConfessionCard = memo(function ConfessionCard({ confession, now }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      id={confession.id}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: 'easeOut' }}
      className="group"
    >
      {/* SAFE: React JSX auto-escapes string content. Do NOT replace with dangerouslySetInnerHTML. */}
      <p className="font-serif text-[17px] leading-[1.8] text-white/85">
        {confession.text}
      </p>
      <div className="mt-2 font-sans text-[12px] text-muted uppercase tracking-wide">
        {formatTimestamp(confession.createdAt, now)}
      </div>
      <div className="mt-6 border-b border-white/[0.06]" />
    </motion.div>
  );
});

export default ConfessionCard;
