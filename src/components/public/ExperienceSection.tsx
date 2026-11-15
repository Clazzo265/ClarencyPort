import { Download, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import type { ExperienceEntry, PublicProfile } from '../../types/portfolio';
import { sanitizeExternalUrl } from '../../utils/validation';
import { SectionReveal, StaggerItem } from '../motion/MotionPrimitives';

interface ExperienceSectionProps {
  experiences: ExperienceEntry[];
  profile: PublicProfile;
}

export function ExperienceSection({ experiences, profile }: ExperienceSectionProps) {
  const published = useMemo(
    () =>
      experiences
        .filter((e) => e.publishState === 'published')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [experiences],
  );

  const cvUrl = sanitizeExternalUrl(profile.cvUrl);
  const canDownloadCv = Boolean(profile.cvEnabled && cvUrl);

  return (
    <section id="experience" className="relative z-10 border-b border-slate-400/15 py-16 sm:py-24">
      <SectionReveal className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
              Education & Experience
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              Academic progression, practical engineering experience, industrial attachments, and
              technical training.
            </p>

            <div className="kl-surface mt-8 rounded-2xl p-6">
              <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                Curriculum Vitae
              </h3>
              {canDownloadCv ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                    Download the latest verified PDF copy of Clarence L. Chilongo&apos;s CV
                    {profile.cvFileName ? ` (${profile.cvFileName})` : ''}.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={profile.cvFileName || 'Clarence-Chilongo-CV.pdf'}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>Download CV (PDF)</span>
                    </a>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  A public CV download is currently unavailable or paused by the owner. Reach out
                  via the contact form below to request a copy directly.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {published.length === 0 ? (
              <div className="rounded-xl border border-slate-400/15 bg-[#101A2E]/40 p-8 text-sm text-[#94A3B8]">
                Education and experience records will appear here once published.
              </div>
            ) : (
              <div className="divide-y divide-slate-400/15 rounded-2xl border border-slate-400/15 bg-[#080D1C]">
                {published.map((entry, idx) => {
                  const verifyUrl = sanitizeExternalUrl(entry.verificationUrl);
                  return (
                    <StaggerItem key={entry.id} index={idx}>
                      <article className="p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-[#22D3EE]">
                            {entry.entryType}
                            {entry.location ? ` · ${entry.location}` : ''}
                          </span>
                          <span className="font-mono text-xs text-[#94A3B8] tabular-nums">
                            {entry.dateRange}
                          </span>
                        </div>

                        <h3 className="mt-2 font-display text-lg font-semibold text-[#F8FAFC]">
                          {entry.title}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-[#94A3B8]">
                          {entry.organization}
                        </p>

                        {entry.description && (
                          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                            {entry.description}
                          </p>
                        )}

                        {verifyUrl && (
                          <a
                            href={verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#22D3EE] hover:underline"
                          >
                            <span>Verify Credential</span>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </article>
                    </StaggerItem>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
