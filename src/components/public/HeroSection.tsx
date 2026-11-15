import { ArrowDownRight, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { HERO_FALLBACK_IMAGE } from '../../data/initialPortfolioData';
import type { PublicProfile } from '../../types/portfolio';
import { sanitizeExternalUrl } from '../../utils/validation';

interface HeroSectionProps {
  profile: PublicProfile;
}

export function HeroSection({ profile }: HeroSectionProps) {
  const [imgError, setImgError] = useState(false);
  const portraitSrc = sanitizeExternalUrl(profile.portraitUrl);
  const hasOwnerPortrait = Boolean(portraitSrc) && !imgError;
  const visualSrc = hasOwnerPortrait ? portraitSrc : HERO_FALLBACK_IMAGE;

  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-slate-400/15 py-16 sm:py-24 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col justify-center lg:col-span-7"
        >
          <p className="text-sm font-medium text-[#22D3EE] tracking-wide">
            {profile.location}
          </p>

          <h1
            style={{ textWrap: 'balance' }}
            className="mt-4 font-display text-4xl font-bold tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]"
          >
            {profile.ownerName}
          </h1>

          <p className="mt-3 text-lg font-medium text-[#94A3B8] sm:text-xl">
            {profile.headline}
          </p>

          <p className="mt-6 max-w-xl font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-[1.65rem]">
            {profile.tagline}
          </p>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#94A3B8]">
            Designing dependable web platforms, offline-capable software workflows, and practical
            embedded systems built to hold up on real devices and modest networks.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#projects"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
            >
              <span>Explore Projects</span>
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <a
              href="#contact"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/25 bg-[#080D1C]/80 px-6 py-2.5 text-sm font-medium text-[#F8FAFC] transition-colors duration-150 hover:border-[#22D3EE]/50 hover:bg-[#101A2E] whitespace-nowrap shrink-0"
            >
              <Mail className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>Contact Me</span>
            </a>
          </div>

          {profile.availabilityNote && (
            <p className="mt-8 border-t border-slate-400/15 pt-5 text-sm text-[#94A3B8]">
              {profile.availabilityNote}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-400/20 bg-[#080D1C] sm:h-96 lg:h-full lg:min-h-[420px]">
            {!imgError ? (
              <img
                src={visualSrc}
                alt={
                  hasOwnerPortrait
                    ? `Portrait of ${profile.ownerName}`
                    : 'Architectural computing glass layers representing KLARENCY engineering'
                }
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
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
