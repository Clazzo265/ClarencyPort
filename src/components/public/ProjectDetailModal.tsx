import { ExternalLink, GitBranch, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Project } from '../../types/portfolio';
import { sanitizeExternalUrl } from '../../utils/validation';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  useEffect(() => {
    if (!project) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [project, onClose]);

  if (!project) return null;

  const githubUrl = sanitizeExternalUrl(project.githubUrl);
  const liveUrl = sanitizeExternalUrl(project.liveUrl);
  const imageUrl = sanitizeExternalUrl(project.imageUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-400/20 bg-[#080D1C] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-400/15 pb-5">
          <div>
            <p className="text-xs font-medium text-[#22D3EE]">
              {project.devStatus}
              {project.technologies.length > 0 && ` · ${project.technologies.join(' · ')}`}
            </p>
            <h3
              id="project-modal-title"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl"
            >
              {project.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${project.title} details`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {imageUrl && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-400/15 bg-[#101A2E]">
            <img
              src={imageUrl}
              alt={`${project.title} preview`}
              referrerPolicy="no-referrer"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[#94A3B8]">
          <div>
            <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">Overview</h4>
            <p className="mt-1.5 text-base text-[#F8FAFC]/90">{project.summary}</p>
          </div>

          {(project.problem || project.intendedUsers) && (
            <div className="grid gap-6 border-t border-slate-400/15 pt-5 sm:grid-cols-2">
              {project.problem && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    Problem Addressed
                  </h4>
                  <p className="mt-1.5">{project.problem}</p>
                </div>
              )}
              {project.intendedUsers && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    Intended Users
                  </h4>
                  <p className="mt-1.5">{project.intendedUsers}</p>
                </div>
              )}
            </div>
          )}

          {project.solution && (
            <div className="border-t border-slate-400/15 pt-5">
              <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                Engineering Approach
              </h4>
              <p className="mt-1.5">{project.solution}</p>
            </div>
          )}

          {project.features && project.features.length > 0 && (
            <div className="border-t border-slate-400/15 pt-5">
              <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">Key Capabilities</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[#F8FAFC]/85">
                {project.features.map((feat, idx) => (
                  <li key={`${feat}-${idx}`}>{feat}</li>
                ))}
              </ul>
            </div>
          )}

          {(project.challenges || project.lessonsLearned) && (
            <div className="grid gap-6 border-t border-slate-400/15 pt-5 sm:grid-cols-2">
              {project.challenges && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">Challenges</h4>
                  <p className="mt-1.5">{project.challenges}</p>
                </div>
              )}
              {project.lessonsLearned && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    Lessons Learned
                  </h4>
                  <p className="mt-1.5">{project.lessonsLearned}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {(githubUrl || liveUrl) && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-400/15 pt-5">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/25 bg-[#101A2E] px-4 py-2 text-sm font-medium text-[#F8FAFC] hover:border-[#22D3EE]/50"
              >
                <GitBranch className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                <span>View Repository</span>
              </a>
            )}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span>Open Live Demo</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
