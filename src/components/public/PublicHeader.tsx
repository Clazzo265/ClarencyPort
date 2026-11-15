import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#research', label: 'Research' },
  { href: '#experience', label: 'Experience' },
];

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-400/15 bg-[#050816]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <a
          href="#home"
          className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0"
        >
          KLARENCY
        </a>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#94A3B8] transition-colors duration-150 hover:text-[#F8FAFC] whitespace-nowrap shrink-0"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#contact"
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
          >
            Contact Me
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-primary-nav"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-400/20 text-[#F8FAFC] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-primary-nav"
          aria-label="Mobile navigation"
          className="border-t border-slate-400/15 bg-[#080D1C] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#F8FAFC] hover:bg-[#101A2E]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white"
            >
              Contact Me
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
