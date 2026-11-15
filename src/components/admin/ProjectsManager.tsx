import {
  Archive,
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  History,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useSyncStatus } from '../../context/SyncStatusContext';
import {
  deleteProjectPermanently,
  fetchProjectRevisions,
  restoreProjectFromRevision,
  transitionProjectState,
  updateProjectFeatureOrder,
} from '../../services/portfolioService';
import type { Project, ProjectRevision, PublishState } from '../../types/portfolio';
import { formatMalawiTime } from '../../utils/portfolioLogic';

interface ProjectsManagerProps {
  projects: Project[];
  onCreateNew: () => void;
  onEditProject: (project: Project) => void;
}

export function ProjectsManager({
  projects,
  onCreateNew,
  onEditProject,
}: ProjectsManagerProps) {
  const { setSaving, setSaved, setSyncError } = useSyncStatus();
  const [filter, setFilter] = useState<'active' | 'draft' | 'archived' | 'trashed'>('active');
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  const visibleProjects = projects
    .filter((p) => {
      if (filter === 'active') return p.publishState === 'published';
      return p.publishState === filter;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleStateChange = async (project: Project, nextState: PublishState) => {
    setSaving();
    try {
      await transitionProjectState(project.id, nextState, project.title);
      setSaved();
    } catch {
      setSyncError();
    }
  };

  const handleToggleFeatured = async (project: Project) => {
    setSaving();
    try {
      await updateProjectFeatureOrder(project.id, !project.featured, project.sortOrder);
      setSaved();
    } catch {
      setSyncError();
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= visibleProjects.length) return;
    const current = visibleProjects[index];
    const swap = visibleProjects[targetIdx];
    setSaving();
    try {
      await updateProjectFeatureOrder(current.id, current.featured, swap.sortOrder);
      await updateProjectFeatureOrder(swap.id, swap.featured, current.sortOrder);
      setSaved();
    } catch {
      setSyncError();
    }
  };

  const openRevisions = async (project: Project) => {
    setRevisionTarget(project);
    setLoadingRevisions(true);
    try {
      const list = await fetchProjectRevisions(project.id);
      setRevisions(list);
    } catch {
      setRevisions([]);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleRestoreRevision = async (rev: ProjectRevision) => {
    if (!revisionTarget) return;
    setSaving();
    try {
      await restoreProjectFromRevision(revisionTarget, rev);
      setSaved();
      setRevisionTarget(null);
    } catch {
      setSyncError();
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    setSaving();
    try {
      await deleteProjectPermanently(confirmDelete.id, confirmDelete.title);
      setSaved();
      setConfirmDelete(null);
    } catch {
      setSyncError();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-400/15 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">Projects</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Reorder, feature, publish, unpublish, archive, or inspect revision history.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Project (Guided)</span>
        </button>
      </div>

      <div role="tablist" aria-label="Filter projects by publication state" className="flex flex-wrap gap-2">
        {(
          [
            { key: 'active', label: `Published (${projects.filter((p) => p.publishState === 'published').length})` },
            { key: 'draft', label: `Drafts (${projects.filter((p) => p.publishState === 'draft').length})` },
            { key: 'archived', label: `Archived (${projects.filter((p) => p.publishState === 'archived').length})` },
            { key: 'trashed', label: `Trash (${projects.filter((p) => p.publishState === 'trashed').length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium tabular-nums ${
              filter === tab.key
                ? 'bg-[#2563EB] text-white'
                : 'border border-slate-400/20 bg-[#080D1C] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleProjects.length === 0 ? (
        <div className="kl-surface rounded-2xl p-10 text-center">
          <p className="text-sm text-[#94A3B8]">No projects in this view yet.</p>
          {filter !== 'trashed' && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 min-h-[44px] rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((project, idx) => (
            <article
              key={project.id}
              className="kl-surface flex flex-col justify-between gap-4 rounded-xl p-5 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#22D3EE]">
                  {project.devStatus} · {project.publishState}
                  {project.featured ? ' · Featured' : ''}
                </p>
                <h2 className="mt-1 truncate font-display text-lg font-semibold text-[#F8FAFC]">
                  {project.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-[#94A3B8]">{project.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filter === 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleMove(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${project.title} up`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMove(idx, 1)}
                      disabled={idx === visibleProjects.length - 1}
                      aria-label={`Move ${project.title} down`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleFeatured(project)}
                      aria-label={project.featured ? `Unfeature ${project.title}` : `Feature ${project.title}`}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
                        project.featured
                          ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[#22D3EE]'
                          : 'border-slate-400/20 text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{project.featured ? 'Featured' : 'Feature'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onEditProject(project)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#F8FAFC] hover:bg-[#101A2E]"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => void openRevisions(project)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>History</span>
                </button>

                {project.publishState === 'published' ? (
                  <button
                    type="button"
                    onClick={() => void handleStateChange(project, 'draft')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Unpublish</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleStateChange(project, 'published')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#2563EB]/20 px-3 text-xs font-semibold text-[#22D3EE] hover:bg-[#2563EB]/30"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Publish</span>
                  </button>
                )}

                {project.publishState !== 'archived' && project.publishState !== 'trashed' && (
                  <button
                    type="button"
                    onClick={() => void handleStateChange(project, 'archived')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Archive</span>
                  </button>
                )}

                {project.publishState !== 'trashed' ? (
                  <button
                    type="button"
                    onClick={() => void handleStateChange(project, 'trashed')}
                    aria-label={`Move ${project.title} to trash`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-rose-300 hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Trash</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleStateChange(project, 'draft')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#22D3EE]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(project)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-rose-600/20 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-600/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Delete Forever</span>
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {revisionTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project revision history"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-400/20 bg-[#080D1C] p-6">
            <div className="flex items-center justify-between border-b border-slate-400/15 pb-4">
              <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Revision History · {revisionTarget.title}
              </h3>
              <button
                type="button"
                onClick={() => setRevisionTarget(null)}
                className="min-h-[36px] px-3 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Close
              </button>
            </div>
            {loadingRevisions ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">Loading saved revisions…</p>
            ) : revisions.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">
                No revision snapshots recorded for this project yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-400/15">
                {revisions.map((rev) => (
                  <li key={rev.id} className="flex items-start justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-[#F8FAFC]">{rev.title}</p>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        {rev.devStatus} · {rev.publishState} · {rev.note}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[#94A3B8]">
                        {formatMalawiTime(rev.createdAt) || 'Snapshot'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRestoreRevision(rev)}
                      className="min-h-[36px] shrink-0 rounded-lg border border-slate-400/25 px-3 text-xs font-medium text-[#22D3EE] hover:bg-[#101A2E]"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm permanent deletion"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#080D1C] p-6">
            <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Delete &ldquo;{confirmDelete.title}&rdquo; permanently?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              This permanently removes the project and all of its revision snapshots from Cloud
              Firestore. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs font-medium text-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handlePermanentDelete()}
                className="min-h-[44px] rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
