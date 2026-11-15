import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { PublicProfile } from '../../types/portfolio';

interface AboutSectionProps {
  profile: PublicProfile;
}

export function AboutSection({ profile }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="about" className="border-b border-slate-400/15 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
            About Clarence
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            Engineering background, development discipline, and practical focus.
          </p>
        </div>

        <div className="lg:col-span-8">
          <p className="max-w-[68ch] text-base leading-relaxed text-[#F8FAFC]/90 sm:text-lg sm:leading-relaxed">
            {profile.shortBio}
          </p>

          {profile.expandedBio && (
            <div className="mt-6">
              {expanded && (
                <p className="mb-5 max-w-[68ch] border-t border-slate-400/15 pt-5 text-base leading-relaxed text-[#94A3B8]">
                  {profile.expandedBio}
                </p>
              )}

              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/20 bg-[#080D1C] px-4 py-2 text-sm font-medium text-[#22D3EE] transition-colors hover:border-[#22D3EE]/50 hover:bg-[#101A2E]"
              >
                <span>{expanded ? 'Show less background' : 'Read engineering perspective'}</span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
