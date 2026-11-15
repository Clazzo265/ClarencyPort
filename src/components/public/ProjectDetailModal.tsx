import { ChevronLeft, ChevronRight, ExternalLink, GitBranch, Maximize2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../../types/portfolio';
import {
  getAdjacentIndex,
  KLARENCY_DURATIONS,
  KLARENCY_EASE,
} from '../../utils/motionTokens';
import { sanitizeExternalUrl } from '../../utils/validation';
import { SmartDriveImage } from '../shared/SmartDriveImage';

interface ProjectDetailModalProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onClose: () => void;
}

export function ProjectDetailModal({
  project,
  projects = [],
  onSelectProject,
  onClose,
}: ProjectDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const shouldReduce = useReducedMotion();

  const currentIdx = project ? projects.findIndex((p) => p.id === project.id) : -1;
  const canNavigate = projects.length > 1 && currentIdx >= 0 && Boolean(onSelectProject);

  const goAdjacent = (delta: -1 | 1) => {
    if (!canNavigate || !onSelectProject) return;
    const nextIdx = getAdjacentIndex(currentIdx, projects.length, delta);
    if (nextIdx >= 0) {
      setLightboxOpen(false);
      onSelectProject(projects[nextIdx]);
    }
  };

  useEffect(() => {
    setLightboxOpen(false);
    setActiveSlideIdx(0);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (!lightboxOpen && e.key === 'ArrowLeft' && canNavigate) {
        goAdjacent(-1);
      } else if (!lightboxOpen && e.key === 'ArrowRight' && canNavigate) {
        goAdjacent(1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const githubUrl = project ? sanitizeExternalUrl(project.githubUrl) : '';
  const liveUrl = project ? sanitizeExternalUrl(project.liveUrl) : '';

  const mediaSlides = useMemo(() => {
    if (!project) return [];
    const list: string[] = [];
    const cover = sanitizeExternalUrl(project.imageUrl);
    if (cover) list.push(cover);
    for (const raw of project.galleryImageUrls ?? []) {
      const clean = sanitizeExternalUrl(raw);
      if (clean && !list.includes(clean)) list.push(clean);
    }
    return list;
  }, [project]);

  const activeImageUrl = mediaSlides[Math.min(activeSlideIdx, Math.max(0, mediaSlides.length - 1))] ?? '';

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: KLARENCY_DURATIONS.fast, ease: KLARENCY_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key={project.id}
            initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: KLARENCY_DURATIONS.fast, ease: KLARENCY_EASE }}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-400/20 bg-[#080D1C] p-6 shadow-2xl sm:p-8"
          >
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

            {activeImageUrl && (
              <div className="mt-6 space-y-3">
                <div className="group relative overflow-hidden rounded-xl border border-slate-400/15 bg-[#101A2E]">
                  <SmartDriveImage
                    src={activeImageUrl}
                    alt={`${project.title} preview ${activeSlideIdx + 1}`}
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`Expand ${project.title} image in lightbox`}
                    className="absolute bottom-3 right-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-400/30 bg-[#050816]/85 px-3 py-1.5 text-xs font-medium text-[#F8FAFC] backdrop-blur-sm transition-colors hover:border-[#22D3EE]"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                    <span>Expand</span>
                  </button>
                </div>

                {mediaSlides.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {mediaSlides.map((slideUrl, idx) => (
                      <button
                        key={`${slideUrl}-${idx}`}
                        type="button"
                        onClick={() => setActiveSlideIdx(idx)}
                        aria-label={`View screenshot ${idx + 1} of ${mediaSlides.length}`}
                        className={`relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border transition-colors ${
                          idx === activeSlideIdx
                            ? 'border-[#22D3EE]'
                            : 'border-slate-400/20 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <SmartDriveImage
                          src={slideUrl}
                          alt={`${project.title} thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
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
                  <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    Key Capabilities
                  </h4>
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
                      <h4 className="font-display text-sm font-semibold text-[#F8FAFC]">
                        Challenges
                      </h4>
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

            {(githubUrl || liveUrl || canNavigate) && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-400/15 pt-5">
                <div className="flex flex-wrap gap-3">
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

                {canNavigate && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goAdjacent(-1)}
                      aria-label="Previous project case study"
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] transition-colors hover:border-[#22D3EE]/40 hover:text-[#F8FAFC]"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => goAdjacent(1)}
                      aria-label="Next project case study"
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] transition-colors hover:border-[#22D3EE]/40 hover:text-[#F8FAFC]"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {lightboxOpen && activeImageUrl && (
              <motion.div
                key="lightbox-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={`${project.title} enlarged image`}
                initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: KLARENCY_DURATIONS.micro }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050816]/95 p-4"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close enlarged image"
                  className="fixed right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-400/30 bg-[#080D1C] text-[#F8FAFC]"
                >
                  <X className="h-5 w-5" />
                </button>
                <SmartDriveImage
                  src={activeImageUrl}
                  alt={`${project.title} full screen`}
                  className="max-h-[88vh] max-w-[94vw] rounded-xl border border-slate-400/20 object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
