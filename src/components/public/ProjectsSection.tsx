import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DevStatus, Project } from '../../types/portfolio';
import { filterPublicProjects } from '../../utils/portfolioLogic';
import { sanitizeExternalUrl } from '../../utils/validation';

const STATUS_FILTERS: Array<'All' | DevStatus> = [
  'All',
  'Completed',
  'In progress',
  'Prototype',
  'Experimental',
];

interface ProjectsSectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export function ProjectsSection({ projects, onSelectProject }: ProjectsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DevStatus>('All');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      filterPublicProjects(projects, {
        query: searchQuery,
        devStatus: statusFilter,
      }),
    [projects, searchQuery, statusFilter],
  );

  return (
    <section id="projects" className="border-b border-slate-400/15 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
              Selected Projects
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
              Software systems and hardware prototypes documented honestly with their current
              development stage, engineering decisions, and lessons learned.
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <label htmlFor="public-project-search" className="sr-only">
              Search projects
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
              aria-hidden="true"
            />
            <input
              id="public-project-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or stack..."
              className="min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#080D1C] pl-10 pr-4 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/70 focus:border-[#22D3EE]"
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Filter projects by development status"
          className="mt-8 flex flex-wrap gap-2"
        >
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(status)}
                className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-slate-400/20 bg-[#101A2E]/70 text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-400/15 bg-[#101A2E]/40 p-10 text-center">
            <p className="text-sm text-[#94A3B8]">No published projects match your current filter.</p>
            {(searchQuery || statusFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="mt-4 min-h-[40px] rounded-lg border border-slate-400/25 px-4 py-2 text-xs font-medium text-[#22D3EE] hover:bg-[#101A2E]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {filtered.map((project, idx) => {
              const imageUrl = sanitizeExternalUrl(project.imageUrl);
              const showImage = Boolean(imageUrl) && !failedImages[project.id];
              const isLead = project.featured && idx === 0 && filtered.length % 2 === 1 && filtered.length > 1;

              return (
                <article
                  key={project.id}
                  className={`kl-surface group overflow-hidden rounded-2xl transition-colors duration-200 hover:border-[#22D3EE]/40 ${
                    isLead ? 'flex flex-col md:col-span-2 md:grid md:grid-cols-12 md:items-stretch' : 'flex flex-col'
                  }`}
                >
                  <div
                    className={`relative overflow-hidden bg-[#080D1C] ${
                      isLead ? 'aspect-[16/9] md:col-span-7 md:aspect-auto md:min-h-[320px]' : 'aspect-[4/3]'
                    }`}
                  >
                    {showImage ? (
                      <img
                        src={imageUrl}
                        alt={`${project.title} showcase`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [project.id]: true }))
                        }
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-end bg-gradient-to-br from-[#080D1C] via-[#101A2E] to-[#050816] p-6">
                        <span className="font-display text-lg font-semibold text-[#F8FAFC]/80">
                          {project.title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-1 flex-col justify-between p-6 ${isLead ? 'md:col-span-5 md:p-8' : ''}`}>
                    <div>
                      <p className="text-xs font-medium text-[#22D3EE]">
                        {project.devStatus}
                        {project.technologies.length > 0 &&
                          ` · ${project.technologies.slice(0, 4).join(' · ')}`}
                      </p>

                      <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-[#F8FAFC]">
                        {project.title}
                      </h3>

                      <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                        {project.summary}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-400/15 pt-4">
                      <button
                        type="button"
                        onClick={() => onSelectProject(project)}
                        aria-label={`Inspect case study for ${project.title}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#F8FAFC] transition-colors hover:text-[#22D3EE]"
                      >
                        <span>Read Case Study</span>
                        <ArrowUpRight className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                      </button>

                      {project.featured && (
                        <span className="font-mono text-xs text-[#94A3B8]">Featured</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
