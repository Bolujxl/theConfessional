import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Confession {
  id: string;
  text: string;
  createdAt: number;
}

const SEED_DATA: Confession[] = [
  {
    id: 'seed-1',
    text: "i told her i was busy working, but i just wanted to sit in the car and listen to the rain for an hour. i don't know why i have to lie to be alone.",
    createdAt: Date.now() - 1000 * 60 * 45, // 45 mins ago
  },
  {
    id: 'seed-3',
    text: "i'm terrified that everyone can see through me. that i'm just a collection of habits i've stolen from people i used to admire.",
    createdAt: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
  },
];

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
}

export default function App() {
  const [confessions, setConfessions] = useState<Confession[]>(SEED_DATA);
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = inputText.length;
  const limit = 280;

  const handleSubmit = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const newConfession: Confession = {
      id: crypto.randomUUID(),
      text: trimmedText,
      createdAt: Date.now(),
    };

    setConfessions([newConfession, ...confessions]);
    setInputText('');
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 selection:bg-white/10">
      {/* Header */}
      <header className="mt-12 flex flex-col items-center text-center">
        <img src="/icon.svg" alt="Logo" className="w-9 h-9 opacity-40" />
        <h1 className="mt-4 text-[16px] font-normal tracking-[0.12em] text-white/40 playfair uppercase">
          The Confessional
        </h1>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[640px] mt-16 pb-20">

        {/* Form */}
        <section className="flex flex-col">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={limit}
            placeholder="say it here. no one will know."
            className={cn(
              "w-full min-h-[140px] bg-surface border border-white/10 rounded-xl p-5",
              "playfair text-[17px] leading-[1.7] text-white placeholder:text-white/20",
              "focus:border-white/20 focus:outline-none resize-y transition-colors"
            )}
          />

          <div className="flex justify-end mt-2">
            <span className={cn(
              "system-ui text-[12px]",
              charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "text-white/25"
            )}>
              {charCount} / {limit}
            </span>
          </div>

          <button
            onClick={handleSubmit}
            className={cn(
              "w-full h-12 mt-3 bg-white/[0.06] border border-white/10 rounded-[10px]",
              "text-white/60 system-ui text-[14px] tracking-[0.08em]",
              "hover:bg-white/10 hover:text-white/90 transition-all duration-200"
            )}
          >
            leave it here
          </button>
        </section>

        {/* Feed */}
        <section className="mt-14 flex flex-col gap-10">
          <AnimatePresence initial={false}>
            {confessions.map((confession) => (
              <motion.div
                key={confession.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="group"
              >
                <p className="playfair text-[17px] leading-[1.8] text-white/85">
                  {confession.text}
                </p>
                <div className="mt-2 system-ui text-[12px] text-white/25 uppercase tracking-wide">
                  {formatTimestamp(confession.createdAt)}
                </div>
                <div className="mt-6 border-b border-white/[0.06]" />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
