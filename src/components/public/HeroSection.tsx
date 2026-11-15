import { ArrowDown, ArrowDownRight, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { HERO_FALLBACK_IMAGE } from '../../data/initialPortfolioData';
import type { PublicProfile } from '../../types/portfolio';
import {
  KLARENCY_DISTANCES,
  KLARENCY_DURATIONS,
  KLARENCY_EASE,
  KLARENCY_STAGGER,
  normalizePointerSpotlight,
} from '../../utils/motionTokens';
import { sanitizeExternalUrl } from '../../utils/validation';
import { SmartDriveImage } from '../shared/SmartDriveImage';

interface HeroSectionProps {
  profile: PublicProfile;
}

export function HeroSection({ profile }: HeroSectionProps) {
  const [imgError, setImgError] = useState(false);
  const [spotlight, setSpotlight] = useState({ xPct: 50, yPct: 35, active: false });
  const [finePointer, setFinePointer] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: fine)');
    setFinePointer(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setFinePointer(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const portraitSrc = sanitizeExternalUrl(profile.portraitUrl);
  const hasOwnerPortrait = Boolean(portraitSrc) && !imgError;
  const visualSrc = hasOwnerPortrait ? portraitSrc : HERO_FALLBACK_IMAGE;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!finePointer || shouldReduce || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const { xPct, yPct } = normalizePointerSpotlight(e.clientX, e.clientY, rect);
    setSpotlight({ xPct, yPct, active: true });
  };

  const enterProps = (step: number) =>
    shouldReduce
      ? {}
      : {
          initial: { opacity: 0, y: KLARENCY_DISTANCES.subtleY },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: KLARENCY_DURATIONS.base,
            delay: step * KLARENCY_STAGGER.hero,
            ease: KLARENCY_EASE,
          },
        };

  return (
    <section
      id="home"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSpotlight((prev) => ({ ...prev, active: false }))}
      className="relative overflow-hidden border-b border-slate-400/15 py-16 sm:py-24 lg:py-28"
    >
      {finePointer && !shouldReduce && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: spotlight.active ? 1 : 0.45,
            background: `radial-gradient(520px circle at ${spotlight.xPct}% ${spotlight.yPct}%, rgba(34, 211, 238, 0.09), rgba(37, 99, 235, 0.04) 42%, transparent 72%)`,
          }}
        />
      )}

      <div className="relative z-10 mx-auto grid max-w-6xl items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="flex flex-col justify-center lg:col-span-7">
          <motion.p
            {...enterProps(1)}
            className="text-sm font-medium tracking-wide text-[#22D3EE]"
          >
            {profile.location}
          </motion.p>

          <motion.h1
            {...enterProps(2)}
            style={{ textWrap: 'balance' }}
            className="mt-4 font-display text-4xl font-bold tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]"
          >
            {profile.ownerName}
          </motion.h1>

          <motion.p
            {...enterProps(3)}
            className="mt-3 text-lg font-medium text-[#94A3B8] sm:text-xl"
          >
            {profile.headline}
          </motion.p>

          <motion.p
            {...enterProps(4)}
            className="mt-6 max-w-xl font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-[1.65rem]"
          >
            {profile.tagline}
          </motion.p>

          <motion.p
            {...enterProps(4.5)}
            className="mt-4 max-w-2xl text-base leading-relaxed text-[#94A3B8]"
          >
            Designing dependable web platforms, offline-capable software workflows, and practical
            embedded systems built to hold up on real devices and modest networks.
          </motion.p>

          <motion.div
            {...enterProps(5)}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <motion.a
              href="#projects"
              whileHover={shouldReduce ? undefined : { y: -1.5 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={{ duration: KLARENCY_DURATIONS.micro, ease: KLARENCY_EASE }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
            >
              <span>Explore Projects</span>
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </motion.a>

            <motion.a
              href="#contact"
              whileHover={shouldReduce ? undefined : { y: -1.5 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={{ duration: KLARENCY_DURATIONS.micro, ease: KLARENCY_EASE }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/25 bg-[#080D1C]/80 px-6 py-2.5 text-sm font-medium text-[#F8FAFC] transition-colors duration-150 hover:border-[#22D3EE]/50 hover:bg-[#101A2E] whitespace-nowrap shrink-0"
            >
              <Mail className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>Contact Me</span>
            </motion.a>
          </motion.div>

          {profile.availabilityNote && (
            <motion.div
              {...enterProps(6)}
              className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-400/15 pt-5"
            >
              <p className="text-sm text-[#94A3B8]">{profile.availabilityNote}</p>
              <a
                href="#about"
                aria-label="Scroll to About section"
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-[#22D3EE] transition-colors hover:text-[#F8FAFC]"
              >
                <span>Scroll</span>
                <motion.span
                  animate={shouldReduce ? undefined : { y: [0, 3, 0] }}
                  transition={
                    shouldReduce
                      ? undefined
                      : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </motion.span>
              </a>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: KLARENCY_DURATIONS.slow, delay: 0.16, ease: KLARENCY_EASE }}
          className="lg:col-span-5"
        >
          <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-400/20 bg-[#080D1C] sm:h-96 lg:h-full lg:min-h-[420px]">
            {!imgError ? (
              <SmartDriveImage
                src={visualSrc}
                alt={
                  hasOwnerPortrait
                    ? `Portrait of ${profile.ownerName}`
                    : 'Architectural computing glass layers representing KLARENCY engineering'
                }
                onAllFailed={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-[#080D1C] via-[#101A2E] to-[#050816] p-8">
                <p className="font-display text-xl font-semibold text-[#F8FAFC]">KLARENCY</p>
                <p className="mt-1 text-sm text-[#94A3B8]">{profile.tagline}</p>
              </div>
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050816]/85 via-[#050816]/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-xs font-medium text-[#22D3EE]">
                {hasOwnerPortrait ? profile.ownerName : 'Systems & Software Craft'}
              </p>
              <p className="mt-1 text-sm text-[#F8FAFC]/90">
                Malawi · International Engineering Audience
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
