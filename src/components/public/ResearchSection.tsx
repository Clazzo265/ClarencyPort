import { FileText } from 'lucide-react';
import { useMemo } from 'react';
import type { ResearchEntry } from '../../types/portfolio';
import { sanitizeExternalUrl } from '../../utils/validation';
import { SectionReveal, StaggerItem } from '../motion/MotionPrimitives';

interface ResearchSectionProps {
  research: ResearchEntry[];
}

export function ResearchSection({ research }: ResearchSectionProps) {
  const published = useMemo(
    () => research.filter((r) => r.publishState === 'published'),
    [research],
  );

  return (
    <section
      id="research"
      className="relative z-10 border-b border-slate-400/15 bg-[#080D1C]/50 py-16 sm:py-24"
    >
      <SectionReveal className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
            Research & Technical Interests
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
            Areas of engineering inquiry, academic investigation, and systems design questions
            currently under exploration.
          </p>
        </div>

        {published.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-400/15 bg-[#101A2E]/40 p-8 text-sm text-[#94A3B8]">
            Research notes will appear here as academic investigations are published.
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {published.map((item, idx) => {
              const docUrl = sanitizeExternalUrl(item.documentUrl);
              return (
                <StaggerItem key={item.id} index={idx}>
                  <article className="kl-surface rounded-2xl p-6 transition-colors duration-200 hover:border-[#22D3EE]/35 sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-[#F8FAFC]">
                        {item.title}
                      </h3>
                      <span className="font-mono text-xs font-medium text-[#22D3EE] whitespace-nowrap shrink-0">
                        {item.stage}
                      </span>
                    </div>

                    <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[#94A3B8] sm:text-base">
                      {item.summary}
                    </p>

                    <div className="mt-6 grid gap-6 border-t border-slate-400/15 pt-5 md:grid-cols-2">
                      {item.researchQuestion && (
                        <div>
                          <h4 className="font-display text-xs font-semibold tracking-wide text-[#F8FAFC]">
                            Core Question
                          </h4>
                          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                            {item.researchQuestion}
                          </p>
                        </div>
                      )}

                      {item.objectives && (
                        <div>
                          <h4 className="font-display text-xs font-semibold tracking-wide text-[#F8FAFC]">
                            Objectives
                          </h4>
                          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                            {item.objectives}
                          </p>
                        </div>
                      )}

                      {item.methods && (
                        <div>
                          <h4 className="font-display text-xs font-semibold tracking-wide text-[#F8FAFC]">
                            Methodology
                          </h4>
                          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                            {item.methods}
                          </p>
                        </div>
                      )}

                      {item.findings && (
                        <div>
                          <h4 className="font-display text-xs font-semibold tracking-wide text-[#F8FAFC]">
                            Findings
                          </h4>
                          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                            {item.findings}
                          </p>
                        </div>
                      )}
                    </div>

                    {(item.references || docUrl) && (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-400/15 pt-4 text-xs text-[#94A3B8]">
                        {item.references && <span>References: {item.references}</span>}
                        {docUrl && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[36px] items-center gap-1.5 font-medium text-[#22D3EE] hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Read Document</span>
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                </StaggerItem>
              );
            })}
          </div>
        )}
      </SectionReveal>
    </section>
  );
}
