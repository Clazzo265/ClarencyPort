import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, FolderOpen, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSyncStatus } from '../../context/SyncStatusContext';
import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from '../../services/indexedDbDrafts';
import { saveProject } from '../../services/portfolioService';
import type {
  DevStatus,
  DriveWorkspaceConfig,
  MediaFileRecord,
  Project,
  PublishState,
} from '../../types/portfolio';
import { generateSlug, projectSchema, sanitizeExternalUrl } from '../../utils/validation';
import { SmartDriveImage } from '../shared/SmartDriveImage';
import { MediaLibraryPickerModal } from './MediaLibraryPickerModal';
import { MediaUploadField } from './MediaUploadField';

const WIZARD_DRAFT_KEY = 'klarency_wizard_project_draft';
const SUGGESTED_TECH = [
  'TypeScript',
  'React',
  'Tailwind CSS',
  'Firebase',
  'Node.js',
  'Python',
  'C++',
  'Embedded C',
  'PostgreSQL',
  'IndexedDB',
  'Zod',
  'Microcontrollers',
];

const DEV_STATUS_OPTIONS: Array<{ value: DevStatus; desc: string }> = [
  { value: 'Completed', desc: 'Tested and finished for current scope.' },
  { value: 'In progress', desc: 'Actively being built and iterated.' },
  { value: 'Prototype', desc: 'Working proof-of-concept demonstrating core behavior.' },
  { value: 'Experimental', desc: 'Early exploration testing a technical hypothesis.' },
  { value: 'Archived', desc: 'Historical project no longer actively developed.' },
];

const STEPS = [
  'Project Name',
  'Short Description',
  'Project Photo',
  'Technologies',
  'Development Status',
  'Optional Links',
  'Case Study Details',
  'Public Preview',
  'Save or Publish',
];

interface WizardFormState {
  title: string;
  slug: string;
  summary: string;
  imageUrl: string;
  coverMediaId: string;
  galleryMediaIds: string[];
  galleryImageUrls: string[];
  technologies: string[];
  devStatus: DevStatus;
  githubUrl: string;
  liveUrl: string;
  problem: string;
  intendedUsers: string;
  solution: string;
  featuresText: string;
  challenges: string;
  lessonsLearned: string;
  featured: boolean;
  sortOrder: number;
}

function normalizeWizardState(
  raw: Partial<WizardFormState> | null | undefined,
  base?: Project | null,
): WizardFormState {
  const defaults = toInitialState(base);
  if (!raw) return defaults;
  return {
    ...defaults,
    ...raw,
    title: typeof raw.title === 'string' ? raw.title : defaults.title,
    slug: typeof raw.slug === 'string' ? raw.slug : defaults.slug,
    summary: typeof raw.summary === 'string' ? raw.summary : defaults.summary,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : defaults.imageUrl,
    coverMediaId: typeof raw.coverMediaId === 'string' ? raw.coverMediaId : defaults.coverMediaId,
    galleryMediaIds: Array.isArray(raw.galleryMediaIds) ? raw.galleryMediaIds.map(String) : defaults.galleryMediaIds,
    galleryImageUrls: Array.isArray(raw.galleryImageUrls) ? raw.galleryImageUrls.map(String) : defaults.galleryImageUrls,
    technologies: Array.isArray(raw.technologies) ? raw.technologies.map(String) : defaults.technologies,
    githubUrl: typeof raw.githubUrl === 'string' ? raw.githubUrl : defaults.githubUrl,
    liveUrl: typeof raw.liveUrl === 'string' ? raw.liveUrl : defaults.liveUrl,
    problem: typeof raw.problem === 'string' ? raw.problem : defaults.problem,
    intendedUsers: typeof raw.intendedUsers === 'string' ? raw.intendedUsers : defaults.intendedUsers,
    solution: typeof raw.solution === 'string' ? raw.solution : defaults.solution,
    featuresText: typeof raw.featuresText === 'string' ? raw.featuresText : defaults.featuresText,
    challenges: typeof raw.challenges === 'string' ? raw.challenges : defaults.challenges,
    lessonsLearned: typeof raw.lessonsLearned === 'string' ? raw.lessonsLearned : defaults.lessonsLearned,
    featured: typeof raw.featured === 'boolean' ? raw.featured : defaults.featured,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : defaults.sortOrder,
  };
}

function toInitialState(editing?: Project | null): WizardFormState {
  if (!editing) {
    return {
      title: '',
      slug: '',
      summary: '',
      imageUrl: '',
      coverMediaId: '',
      galleryMediaIds: [],
      galleryImageUrls: [],
      technologies: [],
      devStatus: 'In progress',
      githubUrl: '',
      liveUrl: '',
      problem: '',
      intendedUsers: '',
      solution: '',
      featuresText: '',
      challenges: '',
      lessonsLearned: '',
      featured: false,
      sortOrder: 10,
    };
  }
  return {
    title: editing.title,
    slug: editing.slug,
    summary: editing.summary,
    imageUrl: editing.imageUrl ?? '',
    coverMediaId: editing.coverMediaId ?? '',
    galleryMediaIds: Array.isArray(editing.galleryMediaIds) ? editing.galleryMediaIds : [],
    galleryImageUrls: Array.isArray(editing.galleryImageUrls) ? editing.galleryImageUrls : [],
    technologies: Array.isArray(editing.technologies) ? editing.technologies : [],
    devStatus: editing.devStatus,
    githubUrl: editing.githubUrl ?? '',
    liveUrl: editing.liveUrl ?? '',
    problem: editing.problem ?? '',
    intendedUsers: editing.intendedUsers ?? '',
    solution: editing.solution ?? '',
    featuresText: (editing.features ?? []).join('\n'),
    challenges: editing.challenges ?? '',
    lessonsLearned: editing.lessonsLearned ?? '',
    featured: editing.featured,
    sortOrder: editing.sortOrder,
  };
}

interface GuidedProjectWizardProps {
  editingProject: Project | null;
  mediaFiles?: MediaFileRecord[];
  driveConfig?: DriveWorkspaceConfig | null;
  onFinished: () => void;
  onCancel: () => void;
}

export function GuidedProjectWizard({
  editingProject,
  mediaFiles = [],
  driveConfig = null,
  onFinished,
  onCancel,
}: GuidedProjectWizardProps) {
  const { setSaving, setSaved, setUnsaved, setSyncError, isOnline } = useSyncStatus();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormState>(() => toInitialState(editingProject));
  const [customTech, setCustomTech] = useState('');
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadActive, setUploadActive] = useState(false);
  const [recoveredBanner, setRecoveredBanner] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [draftShotUrl, setDraftShotUrl] = useState('');
  const [draftShotMediaId, setDraftShotMediaId] = useState('');

  const draftKey = editingProject ? `${WIZARD_DRAFT_KEY}_${editingProject.id}` : WIZARD_DRAFT_KEY;

  useEffect(() => {
    setForm(toInitialState(editingProject));
    setStep(0);
    setStepError(null);
    let mounted = true;
    void loadLocalDraft<Partial<WizardFormState>>(draftKey).then((saved) => {
      if (mounted && saved?.data && !editingProject) {
        setForm(normalizeWizardState(saved.data, null));
        setRecoveredBanner(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [editingProject, draftKey]);

  const updateField = <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setStepError(null);
    setUnsaved(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !editingProject) {
        next.slug = generateSlug(String(value));
      }
      void saveLocalDraft(draftKey, next);
      return next;
    });
  };

  const updateFormPatch = (patch: Partial<WizardFormState>) => {
    setStepError(null);
    setUnsaved(true);
    setForm((prev) => {
      const next = normalizeWizardState({ ...prev, ...patch });
      void saveLocalDraft(draftKey, next);
      return next;
    });
  };

  const toggleTechnology = (tech: string) => {
    const exists = form.technologies.some((t) => t.toLowerCase() === tech.toLowerCase());
    if (exists) {
      updateField(
        'technologies',
        form.technologies.filter((t) => t.toLowerCase() !== tech.toLowerCase()),
      );
    } else if (form.technologies.length < 24) {
      updateField('technologies', [...form.technologies, tech]);
    }
  };

  const handleAddCustomTech = () => {
    const clean = customTech.trim();
    if (!clean) return;
    if (!form.technologies.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      updateField('technologies', [...form.technologies, clean]);
    }
    setCustomTech('');
  };

  const validateCurrentStep = (): boolean => {
    setStepError(null);
    if (step === 0 && form.title.trim().length < 2) {
      setStepError('Please enter a project name (at least 2 characters).');
      return false;
    }
    if (step === 1 && form.summary.trim().length < 10) {
      setStepError('Please enter a short summary of at least 10 characters.');
      return false;
    }
    if (step === 2 && uploadActive) {
      setStepError('Please wait for the photo upload to finish or cancel it before continuing.');
      return false;
    }
    if (step === 3 && form.technologies.length === 0) {
      setStepError('Select at least one technology or add a custom tag.');
      return false;
    }
    if (step === 5) {
      if (form.githubUrl && !/^https?:\/\/.+/.test(form.githubUrl.trim())) {
        setStepError('GitHub URL must begin with https:// or http:// (or leave it empty).');
        return false;
      }
      if (form.liveUrl && !/^https?:\/\/.+/.test(form.liveUrl.trim())) {
        setStepError('Live demo URL must begin with https:// or http:// (or leave it empty).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  };

  const handlePersist = async (targetPublishState: PublishState) => {
    if (submitting) return;
    setStepError(null);

    const features = form.featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20);

    const candidate = {
      title: form.title.trim(),
      slug: generateSlug(form.slug || form.title),
      summary: form.summary.trim(),
      problem: form.problem.trim(),
      intendedUsers: form.intendedUsers.trim(),
      solution: form.solution.trim(),
      features,
      technologies: form.technologies,
      challenges: form.challenges.trim(),
      lessonsLearned: form.lessonsLearned.trim(),
      devStatus: form.devStatus,
      publishState: targetPublishState,
      featured: form.featured,
      sortOrder: form.sortOrder,
      imageUrl: form.imageUrl.trim(),
      coverMediaId: form.coverMediaId.trim(),
      galleryMediaIds: form.galleryMediaIds,
      galleryImageUrls: form.galleryImageUrls,
      githubUrl: form.githubUrl.trim(),
      liveUrl: form.liveUrl.trim(),
    };

    const parsed = projectSchema.safeParse(candidate);
    if (!parsed.success) {
      setStepError(parsed.error.issues[0]?.message || 'Please review required fields.');
      return;
    }

    if (!isOnline) {
      await saveLocalDraft(draftKey, form);
      setStepError(
        'You are offline. Your draft has been preserved locally in IndexedDB—reconnect to sync to Cloud Firestore.',
      );
      return;
    }

    setSubmitting(true);
    setSaving();
    try {
      await saveProject(
        {
          title: parsed.data.title,
          slug: parsed.data.slug,
          summary: parsed.data.summary,
          problem: parsed.data.problem,
          intendedUsers: parsed.data.intendedUsers,
          solution: parsed.data.solution,
          features: parsed.data.features,
          technologies: parsed.data.technologies,
          challenges: parsed.data.challenges,
          lessonsLearned: parsed.data.lessonsLearned,
          devStatus: parsed.data.devStatus,
          publishState: parsed.data.publishState,
          featured: parsed.data.featured,
          sortOrder: parsed.data.sortOrder,
          imageUrl: parsed.data.imageUrl,
          coverMediaId: parsed.data.coverMediaId,
          galleryMediaIds: parsed.data.galleryMediaIds,
          galleryImageUrls: parsed.data.galleryImageUrls,
          githubUrl: parsed.data.githubUrl,
          liveUrl: parsed.data.liveUrl,
        },
        editingProject,
      );
      await clearLocalDraft(draftKey);
      setSaved();
      onFinished();
    } catch {
      setSyncError();
      setStepError(
        'Cloud save failed. Your entered work remains safely preserved locally—please retry.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-400/15 pb-5">
        <div>
          <p className="font-mono text-xs text-[#22D3EE]">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
            {editingProject ? `Edit: ${editingProject.title}` : 'Guided Project Creation'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
        >
          Back to Projects
        </button>
      </div>

      {recoveredBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200">
          <span>Restored your local IndexedDB draft automatically.</span>
          <button
            type="button"
            onClick={() => {
              void clearLocalDraft(draftKey);
              setForm(toInitialState(null));
              setRecoveredBanner(false);
            }}
            className="font-semibold underline"
          >
            Discard local draft
          </button>
        </div>
      )}

      <div className="grid grid-cols-9 gap-1.5" aria-label="Wizard progress">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={`Jump to step ${idx + 1}: ${label}`}
            onClick={() => {
              if (idx <= step || validateCurrentStep()) setStep(idx);
            }}
            className={`h-2 rounded-full transition-colors ${
              idx < step
                ? 'bg-[#2563EB]'
                : idx === step
                  ? 'bg-[#22D3EE]'
                  : 'bg-slate-400/20'
            }`}
          />
        ))}
      </div>

      <div className="kl-surface rounded-2xl p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 1 — Project name
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Choose a clear, descriptive title visitors and recruiters will recognize immediately.
            </p>
            <div>
              <label htmlFor="wiz-title" className="block text-sm font-medium text-[#F8FAFC]">
                Project name (required)
              </label>
              <input
                id="wiz-title"
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Campus Solar Bench Telemetry"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label htmlFor="wiz-slug" className="block text-xs font-medium text-[#94A3B8]">
                URL identifier (auto-generated)
              </label>
              <input
                id="wiz-slug"
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', generateSlug(e.target.value))}
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-400/15 bg-[#050816] px-3.5 font-mono text-xs text-[#94A3B8]"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 2 — Short description
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Summarize what the project does and why it matters in 1–2 crisp sentences.
            </p>
            <p className="rounded-lg border border-slate-400/15 bg-[#050816] p-3 text-xs text-[#94A3B8]">
              Example: &ldquo;An offline-capable academic notes organizer built for affordable
              Android browsers with IndexedDB persistence.&rdquo;
            </p>
            <div>
              <label htmlFor="wiz-summary" className="block text-sm font-medium text-[#F8FAFC]">
                Short summary (required, 10–500 chars)
              </label>
              <textarea
                id="wiz-summary"
                rows={4}
                value={form.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3.5 text-sm text-[#F8FAFC]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Step 3 — Project Cover & Screenshot Gallery
              </h2>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Upload photos to Google Drive KLARENCY MEDIA or reuse assets already in your Media Library.
              </p>
            </div>

            <MediaUploadField
              label="Primary cover image (optional)"
              helperText="Displayed on the main project card and at the top of the case study."
              folder="images"
              category="project-cover"
              contextSlug={form.slug || form.title}
              value={form.imageUrl}
              mediaId={form.coverMediaId}
              mediaFiles={mediaFiles}
              driveConfig={driveConfig}
              allowCropToggle
              onChange={(url, _name, nextMediaId) => {
                updateFormPatch({ imageUrl: url, coverMediaId: nextMediaId ?? '' });
              }}
              onStatusChange={(s) => setUploadActive(s === 'uploading')}
            />

            <div className="space-y-3 rounded-xl border border-slate-400/20 bg-[#050816]/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[#F8FAFC]">
                    Additional Screenshots Gallery ({(form.galleryImageUrls ?? []).length})
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Add extra UI screens or hardware bench photos to showcase inside the case study modal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryPickerOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/25 bg-[#080D1C] px-3.5 text-xs font-medium text-[#F8FAFC] hover:border-[#22D3EE]/50"
                >
                  <FolderOpen className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                  <span>Pick Screenshot from Library</span>
                </button>
              </div>

              {(form.galleryImageUrls ?? []).length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(form.galleryImageUrls ?? []).map((shotUrl, idx) => (
                    <div
                      key={`${shotUrl}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-400/15 bg-[#080D1C] p-2.5"
                    >
                      <SmartDriveImage
                        src={shotUrl}
                        alt={`Screenshot ${idx + 1}`}
                        className="h-14 w-20 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-[#22D3EE]">Slide #{idx + 1}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            aria-label={`Move screenshot ${idx + 1} up`}
                            onClick={() => {
                              const urls = [...(form.galleryImageUrls ?? [])];
                              const ids = [...(form.galleryMediaIds ?? [])];
                              [urls[idx - 1], urls[idx]] = [urls[idx], urls[idx - 1]];
                              if (ids[idx] !== undefined && ids[idx - 1] !== undefined) {
                                [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                              }
                              updateFormPatch({ galleryImageUrls: urls, galleryMediaIds: ids });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-400/20 text-[#94A3B8] disabled:opacity-35"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (form.galleryImageUrls ?? []).length - 1}
                            aria-label={`Move screenshot ${idx + 1} down`}
                            onClick={() => {
                              const urls = [...(form.galleryImageUrls ?? [])];
                              const ids = [...(form.galleryMediaIds ?? [])];
                              [urls[idx + 1], urls[idx]] = [urls[idx], urls[idx + 1]];
                              if (ids[idx] !== undefined && ids[idx + 1] !== undefined) {
                                [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
                              }
                              updateFormPatch({ galleryImageUrls: urls, galleryMediaIds: ids });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-400/20 text-[#94A3B8] disabled:opacity-35"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove screenshot ${idx + 1}`}
                            onClick={() => {
                              updateFormPatch({
                                galleryImageUrls: (form.galleryImageUrls ?? []).filter((_, i) => i !== idx),
                                galleryMediaIds: (form.galleryMediaIds ?? []).filter((_, i) => i !== idx),
                              });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-400/20 text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <MediaUploadField
                label="Upload a new screenshot to gallery"
                helperText="After upload completes, it appends automatically to the project screenshot list."
                folder="images"
                category="project-screenshot"
                contextSlug={form.slug || form.title}
                value={draftShotUrl}
                mediaId={draftShotMediaId}
                mediaFiles={mediaFiles}
                driveConfig={driveConfig}
                onChange={(url, _name, nextId) => {
                  if (url) {
                    const currentUrls = form.galleryImageUrls ?? [];
                    const currentIds = form.galleryMediaIds ?? [];
                    updateFormPatch({
                      galleryImageUrls: [...currentUrls, url],
                      galleryMediaIds: nextId ? [...currentIds, nextId] : currentIds,
                    });
                    setDraftShotUrl('');
                    setDraftShotMediaId('');
                  }
                }}
                onStatusChange={(s) => setUploadActive(s === 'uploading')}
              />

              <MediaLibraryPickerModal
                open={galleryPickerOpen}
                onClose={() => setGalleryPickerOpen(false)}
                mediaFiles={mediaFiles}
                expectedKind="image"
                requirePublicForDisplay
                onSelect={(rec) => {
                  const currentUrls = form.galleryImageUrls ?? [];
                  const currentIds = form.galleryMediaIds ?? [];
                  if (rec.publicUrl && !currentUrls.includes(rec.publicUrl)) {
                    updateFormPatch({
                      galleryImageUrls: [...currentUrls, rec.publicUrl],
                      galleryMediaIds: [...currentIds, rec.id],
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 4 — Technologies used
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Tap existing technologies or add a custom tool.
            </p>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TECH.map((tech) => {
                const selected = form.technologies.some(
                  (t) => t.toLowerCase() === tech.toLowerCase(),
                );
                return (
                  <button
                    key={tech}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTechnology(tech)}
                    className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-[#2563EB] text-white'
                        : 'border border-slate-400/20 bg-[#050816] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tech}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <label htmlFor="wiz-custom-tech" className="sr-only">
                Add custom technology
              </label>
              <input
                id="wiz-custom-tech"
                type="text"
                value={customTech}
                onChange={(e) => setCustomTech(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTech();
                  }
                }}
                placeholder="Add another technology..."
                className="min-h-[44px] flex-1 rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
              />
              <button
                type="button"
                onClick={handleAddCustomTech}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-400/25 bg-[#101A2E] px-4 text-xs font-semibold text-[#F8FAFC]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>

            {form.technologies.length > 0 && (
              <p className="text-xs text-[#22D3EE]">
                Selected: {form.technologies.join(' · ')}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 5 — Development status
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Select the honest current stage of this work.
            </p>
            <div className="space-y-2.5">
              {DEV_STATUS_OPTIONS.map((opt) => {
                const selected = form.devStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('devStatus', opt.value)}
                    className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#22D3EE] bg-[#2563EB]/15'
                        : 'border-slate-400/20 bg-[#050816]/60 hover:border-slate-400/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#F8FAFC]">{opt.value}</p>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">{opt.desc}</p>
                    </div>
                    {selected && <Check className="h-5 w-5 shrink-0 text-[#22D3EE]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 6 — Optional links
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Both fields are optional. Only add links that point to real repositories or live
              deployments.
            </p>
            <div>
              <label htmlFor="wiz-github" className="block text-sm font-medium text-[#F8FAFC]">
                GitHub repository URL (optional)
              </label>
              <input
                id="wiz-github"
                type="url"
                value={form.githubUrl}
                onChange={(e) => updateField('githubUrl', e.target.value)}
                placeholder="https://github.com/username/repo"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label htmlFor="wiz-live" className="block text-sm font-medium text-[#F8FAFC]">
                Live demonstration URL (optional)
              </label>
              <input
                id="wiz-live"
                type="url"
                value={form.liveUrl}
                onChange={(e) => updateField('liveUrl', e.target.value)}
                placeholder="https://example.com"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 7 — Additional case study details
            </h2>
            <p className="text-sm text-[#94A3B8]">
              All fields below are optional and can be completed later.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wiz-problem" className="block text-xs font-medium text-[#F8FAFC]">
                  Problem addressed
                </label>
                <textarea
                  id="wiz-problem"
                  rows={3}
                  value={form.problem}
                  onChange={(e) => updateField('problem', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
                />
              </div>
              <div>
                <label htmlFor="wiz-users" className="block text-xs font-medium text-[#F8FAFC]">
                  Intended users
                </label>
                <textarea
                  id="wiz-users"
                  rows={3}
                  value={form.intendedUsers}
                  onChange={(e) => updateField('intendedUsers', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="wiz-solution" className="block text-xs font-medium text-[#F8FAFC]">
                Proposed or implemented solution
              </label>
              <textarea
                id="wiz-solution"
                rows={3}
                value={form.solution}
                onChange={(e) => updateField('solution', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label htmlFor="wiz-features" className="block text-xs font-medium text-[#F8FAFC]">
                Main features (one per line)
              </label>
              <textarea
                id="wiz-features"
                rows={3}
                value={form.featuresText}
                onChange={(e) => updateField('featuresText', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wiz-challenges" className="block text-xs font-medium text-[#F8FAFC]">
                  Challenges
                </label>
                <textarea
                  id="wiz-challenges"
                  rows={3}
                  value={form.challenges}
                  onChange={(e) => updateField('challenges', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
                />
              </div>
              <div>
                <label htmlFor="wiz-lessons" className="block text-xs font-medium text-[#F8FAFC]">
                  Lessons learned
                </label>
                <textarea
                  id="wiz-lessons"
                  rows={3}
                  value={form.lessonsLearned}
                  onChange={(e) => updateField('lessonsLearned', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 8 — Public card preview
            </h2>
            <p className="text-sm text-[#94A3B8]">
              This preview reflects how visitors will see this project once published.
            </p>

            <div className="overflow-hidden rounded-2xl border border-slate-400/20 bg-[#050816]">
              {sanitizeExternalUrl(form.imageUrl) ? (
                <SmartDriveImage
                  src={sanitizeExternalUrl(form.imageUrl)}
                  alt={form.title || 'Project preview'}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] items-end bg-gradient-to-br from-[#080D1C] via-[#101A2E] to-[#050816] p-6">
                  <span className="font-display text-lg font-semibold text-[#F8FAFC]/80">
                    {form.title || 'Untitled Project'}
                  </span>
                </div>
              )}
              <div className="p-6">
                <p className="text-xs font-medium text-[#22D3EE]">
                  {form.devStatus}
                  {form.technologies.length > 0 && ` · ${form.technologies.join(' · ')}`}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#F8FAFC]">
                  {form.title || 'Untitled Project'}
                </h3>
                <p className="mt-2 text-sm text-[#94A3B8]">{form.summary}</p>
                {(form.galleryImageUrls ?? []).length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {(form.galleryImageUrls ?? []).map((url, idx) => (
                      <SmartDriveImage
                        key={`${url}-${idx}`}
                        src={url}
                        alt={`Gallery preview ${idx + 1}`}
                        className="h-14 w-24 shrink-0 rounded-lg border border-slate-400/20 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Step 9 — Save or publish
            </h2>
            <div className="rounded-xl border border-slate-400/15 bg-[#050816] p-4 text-sm text-[#94A3B8]">
              <p className="font-medium text-[#F8FAFC]">Visibility guarantee:</p>
              <p className="mt-1">
                Choosing <strong className="text-[#F8FAFC]">Save as draft</strong> keeps this entry
                strictly private under Firestore Security Rules. Choosing{' '}
                <strong className="text-[#22D3EE]">Publish</strong> makes the project title,
                summary, status, photo, case study details, and any supplied links immediately visible
                on the public portfolio.
              </p>
            </div>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => updateField('featured', e.target.checked)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              <span>Feature this project at the top of the public showcase</span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handlePersist('draft')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/25 bg-[#080D1C] px-5 py-2.5 text-sm font-medium text-[#F8FAFC] hover:bg-[#101A2E] disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{submitting ? 'Saving…' : 'Save as draft'}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handlePersist('published')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span>{submitting ? 'Publishing…' : 'Publish to website'}</span>
              </button>
            </div>
          </div>
        )}

        {stepError && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">
            {stepError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-400/15 pt-5">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              setStepError(null);
              setStep((s) => Math.max(0, s - 1));
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-4 py-2 text-xs font-medium text-[#F8FAFC] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </button>

          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
