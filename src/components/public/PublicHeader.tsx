import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  computeScrollProgress,
  KLARENCY_DURATIONS,
  KLARENCY_EASE,
  KLARENCY_SPRING,
  resolveActiveSection,
} from '../../utils/motionTokens';

const NAV_LINKS = [
  { href: '#about', id: 'about', label: 'About' },
  { href: '#skills', id: 'skills', label: 'Skills' },
  { href: '#projects', id: 'projects', label: 'Projects' },
  { href: '#research', id: 'research', label: 'Research' },
  { href: '#experience', id: 'experience', label: 'Experience' },
];

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const updateOnScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setScrollProgress(
        computeScrollProgress(
          y,
          document.documentElement.scrollHeight,
          window.innerHeight,
        ),
      );

      const trackedIds = ['home', 'about', 'skills', 'projects', 'research', 'experience', 'contact'];
      const measured = trackedIds
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.offsetTop } : null;
        })
        .filter((item): item is { id: string; top: number } => item !== null);

      setActiveSection(resolveActiveSection(measured, y, 160));
    };

    updateOnScroll();
    window.addEventListener('scroll', updateOnScroll, { passive: true });
    window.addEventListener('resize', updateOnScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateOnScroll);
      window.removeEventListener('resize', updateOnScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled
          ? 'border-b border-slate-400/20 bg-[#050816]/90 backdrop-blur-md'
          : 'border-b border-transparent bg-[#050816]/45 backdrop-blur-sm'
      }`}
    >
      <div
        aria-hidden="true"
        className="h-[2px] w-full origin-left bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#8B5CF6] transition-transform duration-75"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <a
          href="#home"
          className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0"
        >
          KLARENCY
        </a>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'location' : undefined}
                className={`relative py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="public-nav-underline"
                    transition={shouldReduce ? { duration: 0 } : KLARENCY_SPRING}
                    className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#22D3EE]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <motion.a
            href="#contact"
            whileHover={shouldReduce ? undefined : { y: -1 }}
            whileTap={shouldReduce ? undefined : { scale: 0.98 }}
            transition={{ duration: KLARENCY_DURATIONS.micro, ease: KLARENCY_EASE }}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
          >
            Contact Me
          </motion.a>

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

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-primary-nav"
            aria-label="Mobile navigation"
            initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: KLARENCY_DURATIONS.fast, ease: KLARENCY_EASE }}
            className="border-t border-slate-400/15 bg-[#080D1C]/95 px-4 py-4 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 text-sm font-medium ${
                      isActive
                        ? 'bg-[#2563EB]/20 text-[#22D3EE]'
                        : 'text-[#F8FAFC] hover:bg-[#101A2E]'
                    }`}
                  >
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white"
              >
                Contact Me
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
