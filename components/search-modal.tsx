'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchCategory = 'All' | 'Dining' | 'Stores' | 'Activities' | 'Repairs';
export type SearchDiscoveryCategory = Exclude<SearchCategory, 'All'>;

export interface SearchSuggestion {
  name: string;
  subtitle: string;
  category: SearchDiscoveryCategory;
  image: string;
}

const filters: { label: string; value: SearchCategory }[] = [
  { label: 'All', value: 'All' },
  { label: 'Dining', value: 'Dining' },
  { label: 'Stores', value: 'Stores' },
  { label: 'Activities & Salon', value: 'Activities' },
  { label: 'Repairs & Services', value: 'Repairs' },
];

export function SearchModal({
  open,
  query,
  location,
  suggestions,
  onQueryChange,
  onClose,
  onSelect,
}: {
  open: boolean;
  query: string;
  location: string;
  suggestions: SearchSuggestion[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSelect: (suggestion: SearchSuggestion) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<SearchCategory>('All');

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const visibleSuggestions = suggestions.filter((suggestion) => {
    const matchesFilter = activeFilter === 'All' || suggestion.category === activeFilter;
    const matchesQuery = !query.trim() || `${suggestion.name} ${suggestion.subtitle}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pb-8 pt-20 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-search-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="market-search-title" className="sr-only">Search Kehi</h2>
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
              <Search className="h-5 w-5 shrink-0 text-neutral-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search for 'Himalayan Java', 'AC Repair', 'Salon'..."
                className="w-full min-w-0 text-base font-medium outline-none placeholder:text-neutral-400"
              />
              <button type="button" onClick={onClose} aria-label="Close search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scrollbar-hide -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Search categories">
              {filters.map((filter) => (
                <button key={filter.value} type="button" aria-pressed={activeFilter === filter.value} onClick={() => setActiveFilter(filter.value)} className={cn('shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors', activeFilter === filter.value ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50')}>
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900">Trending in {location}</h3>
              <span className="text-xs text-neutral-500">{visibleSuggestions.length} suggestions</span>
            </div>
            <div className="mt-4 grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {visibleSuggestions.map((suggestion) => (
                <button key={`${suggestion.category}-${suggestion.name}`} type="button" onClick={() => onSelect(suggestion)} className="flex min-w-0 items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-neutral-50">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    <Image src={suggestion.image} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">{suggestion.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">{suggestion.subtitle}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              ))}
              {visibleSuggestions.length === 0 && <p className="col-span-full py-8 text-center text-sm text-neutral-500">No matches yet. Try another search or category.</p>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}