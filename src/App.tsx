import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { stripHtml } from './lib/stripHtml';
import { useRelativeTime } from './hooks/useRelativeTime';
import { useEphemeral } from './hooks/useEphemeral';
import ConfessionCard from './components/ConfessionCard';
import LightRays from './components/LightRays';
import type { Confession } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHAR_LIMIT = 280;

export default function App() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [inputText, setInputText] = useState('');
  const [showSkipLink, setShowSkipLink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const now = useRelativeTime();
  const ephemeral = useEphemeral(confessions);
  const visible = ephemeral.filter((c) => !c.gone);

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

    setConfessions([...confessions, newConfession]);
    setInputText('');
    setShowSkipLink(true);
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 selection:bg-white/10">

      {/* Background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#444444"
          raysSpeed={0.8}
          lightSpread={0.5}
          rayLength={3}
          followMouse={false}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div>

      {/* Header */}
      <header className="relative mt-12 flex flex-col items-center text-center" style={{ zIndex: 1 }}>
        <img src="/icon.svg" alt="Logo" className="w-9 h-9 opacity-40" />
        <h1 className="mt-4 text-[16px] font-normal tracking-[0.12em] text-white/40 font-serif uppercase">
          The Confessional
        </h1>
      </header>

      {/* Main Content */}
      <main className="relative w-full max-w-[640px] mt-16 pb-20" style={{ zIndex: 1 }}>

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
              "font-sans text-[12px] transition-opacity duration-300",
              charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "opacity-0 pointer-events-none"
            )}>
              {charCount} / {CHAR_LIMIT}
            </span>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmit}
              className="font-sans text-[13px] tracking-[0.08em] text-white/35 hover:text-white/70 transition-colors duration-200"
            >
              leave it here
            </button>
          </div>
        </section>

        {/* Feed */}
        <section className="mt-14">
          {showSkipLink && visible.length > 0 && (
            <a
              href={`#${visible[visible.length - 1].id}`}
              className="block mb-6 font-sans text-[13px] text-white/60 hover:text-white/90 transition-colors"
              onClick={() => setShowSkipLink(false)}
            >
              skip to your confession ↓
            </a>
          )}
          <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-10">
            <AnimatePresence initial={false}>
              {visible.map((c) => (
                <ConfessionCard
                  key={c.id}
                  confession={c}
                  now={now}
                  opacity={c.opacity}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
