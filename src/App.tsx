import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { stripHtml } from './lib/stripHtml';
import { useRelativeTime } from './hooks/useRelativeTime';
import ConfessionCard from './components/ConfessionCard';
import type { Confession } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHAR_LIMIT = 280;

const SEED_DATA: Confession[] = [
  {
    id: 'seed-1',
    text: "i told her i was busy working, but i just wanted to sit in the car and listen to the rain for an hour. i don't know why i have to lie to be alone.",
    createdAt: Date.now() - 1000 * 60 * 45,
  },
];

export default function App() {
  const [confessions, setConfessions] = useState<Confession[]>(SEED_DATA);
  const [inputText, setInputText] = useState('');
  const [showSkipLink, setShowSkipLink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const now = useRelativeTime();

  const charCount = inputText.length;

  const handleSubmit = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const sanitizedText = stripHtml(trimmedText);

    const newConfession: Confession = {
      id: crypto.randomUUID(),
      text: sanitizedText,
      createdAt: Date.now(),
    };

    setConfessions([newConfession, ...confessions]);
    setInputText('');
    setShowSkipLink(true);
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 selection:bg-white/10">
      {/* Header */}
      <header className="mt-12 flex flex-col items-center text-center">
        <img src="/icon.svg" alt="Logo" className="w-9 h-9 opacity-40" />
        <h1 className="mt-4 text-[16px] font-normal tracking-[0.12em] text-white/40 font-serif uppercase">
          The Confessional
        </h1>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[640px] mt-16 pb-20">

        {/* Form */}
        <section className="flex flex-col">
          <label htmlFor="confession-textarea" className="sr-only">
            Write your anonymous confession
          </label>
          <textarea
            id="confession-textarea"
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            maxLength={CHAR_LIMIT}
            placeholder="say it here. no one will know."
            className={cn(
              "w-full min-h-[140px] bg-surface border border-white/10 rounded-xl p-5",
              "font-serif text-[17px] leading-[1.7] text-white placeholder:text-subtle",
              "focus:border-white/20 focus:outline-none resize-y transition-colors"
            )}
          />

          <div className="flex justify-end mt-2">
            <span className={cn(
              "font-sans text-[12px]",
              charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "text-muted"
            )}>
              {charCount} / {CHAR_LIMIT}
            </span>
          </div>

          <button
            onClick={handleSubmit}
            className={cn(
              "w-full h-12 mt-3 bg-white/[0.06] border border-white/10 rounded-[10px]",
              "text-white/60 font-sans text-[14px] tracking-[0.08em]",
              "hover:bg-white/10 hover:text-white/90 transition-all duration-200"
            )}
          >
            leave it here
          </button>
        </section>

        {/* Feed */}
        <section className="mt-14">
          {showSkipLink && confessions.length > 0 && (
            <a
              href={`#${confessions[0].id}`}
              className="block mb-6 font-sans text-[13px] text-white/60 hover:text-white/90 transition-colors"
              onClick={() => setShowSkipLink(false)}
            >
              skip to your confession ↓
            </a>
          )}
          <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-10">
            <AnimatePresence initial={false}>
              {confessions.map((confession) => (
                <ConfessionCard
                  key={confession.id}
                  confession={confession}
                  now={now}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
