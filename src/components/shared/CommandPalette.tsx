import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ContactMessage,
  ExperienceEntry,
  Project,
  ResearchEntry,
  SearchableItem,
  Skill,
} from '../../types/portfolio';
import { buildSearchIndex } from '../../utils/portfolioLogic';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  projects: Project[];
  skills: Skill[];
  research: ResearchEntry[];
  experiences: ExperienceEntry[];
  messages: ContactMessage[];
  onSelectItem: (item: SearchableItem) => void;
}

export function CommandPalette({
  open,
  onClose,
  isAdmin,
  projects,
  skills,
  research,
  experiences,
  messages,
  onSelectItem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const results = useMemo(
    () =>
      buildSearchIndex({
        isAdmin,
        query,
        projects,
        skills,
        research,
        experiences,
        messages,
      }),
    [isAdmin, query, projects, skills, research, experiences, messages],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#050816]/80 px-4 pt-16 backdrop-blur-sm sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-400/25 bg-[#080D1C] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-400/15 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[#22D3EE]" aria-hidden="true" />
          <label htmlFor="global-command-search" className="sr-only">
            Search KLARENCY content
          </label>
          <input
            ref={inputRef}
            id="global-command-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isAdmin
                ? 'Search projects, skills, research, messages...'
                : 'Search published projects, skills, research...'
            }
            className="min-h-[40px] w-full bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#101A2E] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No matching entries found.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectItem(item);
                      onClose();
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-[#101A2E]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#F8FAFC]">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[#94A3B8]">{item.subtitle}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[#22D3EE]">
                      {item.statusLabel || item.kind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
