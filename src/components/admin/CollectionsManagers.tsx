import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSyncStatus } from '../../context/SyncStatusContext';
import {
  deleteExperience,
  deleteResearch,
  deleteSkill,
  saveExperience,
  saveResearch,
  saveSkill,
} from '../../services/portfolioService';
import type {
  DriveWorkspaceConfig,
  ExperienceEntry,
  ExperienceType,
  MediaFileRecord,
  ResearchEntry,
  ResearchStage,
  SimplePublishState,
  Skill,
  SkillCategory,
  SkillProficiency,
} from '../../types/portfolio';
import { experienceSchema, researchSchema, skillSchema } from '../../utils/validation';
import { MediaUploadField } from './MediaUploadField';

const SKILL_CATEGORIES: SkillCategory[] = [
  'Programming Languages',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
  'Databases',
  'Tools & Technologies',
];
const SKILL_PROFICIENCIES: SkillProficiency[] = [
  'Beginner',
  'Developing',
  'Intermediate',
  'Advanced',
];
const RESEARCH_STAGES: ResearchStage[] = [
  'Research Interest',
  'Ongoing Investigation',
  'Completed Academic Work',
  'Published Research',
];
const EXPERIENCE_TYPES: ExperienceType[] = [
  'Education',
  'Relevant Experience',
  'Industrial Attachment',
  'Technical Training',
  'Certification',
];

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const { setSaving, setSaved, setSyncError } = useSyncStatus();
  const [editing, setEditing] = useState<Skill | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SkillCategory>('Programming Languages');
  const [proficiency, setProficiency] = useState<SkillProficiency>('Developing');
  const [description, setDescription] = useState('');
  const [publishState, setPublishState] = useState<SimplePublishState>('published');
  const [error, setError] = useState<string | null>(null);

  const loadForEdit = (s: Skill) => {
    setEditing(s);
    setName(s.name);
    setCategory(s.category);
    setProficiency(s.proficiency);
    setDescription(s.description ?? '');
    setPublishState(s.publishState);
    setError(null);
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setCategory('Programming Languages');
    setProficiency('Developing');
    setDescription('');
    setPublishState('published');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = skillSchema.safeParse({
      name,
      category,
      proficiency,
      description,
      publishState,
      sortOrder: editing?.sortOrder ?? skills.length + 1,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check skill fields.');
      return;
    }
    setSaving();
    try {
      await saveSkill(parsed.data, editing?.id);
      setSaved();
      resetForm();
    } catch {
      setSyncError();
      setError('Could not save skill to cloud.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-400/15 pb-5">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">Skills</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Categorize technical capabilities using honest proficiency levels.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kl-surface space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
          {editing ? `Edit skill: ${editing.name}` : 'Add a technical skill'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sk-name" className="block text-xs font-medium text-[#F8FAFC]">
              Skill name
            </label>
            <input
              id="sk-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="sk-cat" className="block text-xs font-medium text-[#F8FAFC]">
              Category
            </label>
            <select
              id="sk-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as SkillCategory)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              {SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sk-prof" className="block text-xs font-medium text-[#F8FAFC]">
              Proficiency level
            </label>
            <select
              id="sk-prof"
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              {SKILL_PROFICIENCIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sk-pub" className="block text-xs font-medium text-[#F8FAFC]">
              Visibility
            </label>
            <select
              id="sk-pub"
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as SimplePublishState)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              <option value="published">Published (Public)</option>
              <option value="draft">Draft (Private)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="sk-desc" className="block text-xs font-medium text-[#F8FAFC]">
            Brief description (optional)
          </label>
          <input
            id="sk-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
          />
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{editing ? 'Update Skill' : 'Add Skill'}</span>
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs text-[#94A3B8]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="kl-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          >
            <div>
              <p className="text-xs text-[#22D3EE]">
                {skill.category} · {skill.proficiency} · {skill.publishState}
              </p>
              <p className="mt-0.5 font-display text-base font-semibold text-[#F8FAFC]">
                {skill.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadForEdit(skill)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#F8FAFC]"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => void deleteSkill(skill.id, skill.name)}
                aria-label={`Delete ${skill.name}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResearchManager({
  research,
  mediaFiles = [],
  driveConfig = null,
}: {
  research: ResearchEntry[];
  mediaFiles?: MediaFileRecord[];
  driveConfig?: DriveWorkspaceConfig | null;
}) {
  const { setSaving, setSaved, setSyncError } = useSyncStatus();
  const [editing, setEditing] = useState<ResearchEntry | null>(null);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<ResearchStage>('Research Interest');
  const [summary, setSummary] = useState('');
  const [researchQuestion, setResearchQuestion] = useState('');
  const [objectives, setObjectives] = useState('');
  const [methods, setMethods] = useState('');
  const [findings, setFindings] = useState('');
  const [references, setReferences] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentMediaId, setDocumentMediaId] = useState('');
  const [publishState, setPublishState] = useState<SimplePublishState>('published');
  const [error, setError] = useState<string | null>(null);

  const loadForEdit = (item: ResearchEntry) => {
    setEditing(item);
    setTitle(item.title);
    setStage(item.stage);
    setSummary(item.summary);
    setResearchQuestion(item.researchQuestion ?? '');
    setObjectives(item.objectives ?? '');
    setMethods(item.methods ?? '');
    setFindings(item.findings ?? '');
    setReferences(item.references ?? '');
    setDocumentUrl(item.documentUrl ?? '');
    setDocumentMediaId(item.documentMediaId ?? '');
    setPublishState(item.publishState);
    setError(null);
  };

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setStage('Research Interest');
    setSummary('');
    setResearchQuestion('');
    setObjectives('');
    setMethods('');
    setFindings('');
    setReferences('');
    setDocumentUrl('');
    setDocumentMediaId('');
    setPublishState('published');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = researchSchema.safeParse({
      title,
      stage,
      summary,
      researchQuestion,
      objectives,
      methods,
      findings,
      references,
      documentUrl,
      documentMediaId,
      publishState,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check research entry fields.');
      return;
    }
    setSaving();
    try {
      await saveResearch(parsed.data, editing?.id);
      setSaved();
      resetForm();
    } catch {
      setSyncError();
      setError('Failed to save research entry.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-400/15 pb-5">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Research & Investigations
        </h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Clearly distinguish research interests, ongoing work, completed academic studies, and
          published outputs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kl-surface space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
          {editing ? `Edit research: ${editing.title}` : 'Add research entry'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="res-title" className="block text-xs font-medium text-[#F8FAFC]">
              Research topic or title
            </label>
            <input
              id="res-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="res-stage" className="block text-xs font-medium text-[#F8FAFC]">
              Stage
            </label>
            <select
              id="res-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as ResearchStage)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              {RESEARCH_STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="res-sum" className="block text-xs font-medium text-[#F8FAFC]">
            Summary
          </label>
          <textarea
            id="res-sum"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="res-q" className="block text-xs font-medium text-[#F8FAFC]">
              Research question (optional)
            </label>
            <textarea
              id="res-q"
              rows={2}
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="res-obj" className="block text-xs font-medium text-[#F8FAFC]">
              Objectives (optional)
            </label>
            <textarea
              id="res-obj"
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="res-meth" className="block text-xs font-medium text-[#F8FAFC]">
              Methods (optional)
            </label>
            <textarea
              id="res-meth"
              rows={2}
              value={methods}
              onChange={(e) => setMethods(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="res-find" className="block text-xs font-medium text-[#F8FAFC]">
              Findings when available (optional)
            </label>
            <textarea
              id="res-find"
              rows={2}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="res-ref" className="block text-xs font-medium text-[#F8FAFC]">
              References (optional)
            </label>
            <input
              id="res-ref"
              type="text"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="res-pub" className="block text-xs font-medium text-[#F8FAFC]">
              Visibility
            </label>
            <select
              id="res-pub"
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as SimplePublishState)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              <option value="published">Published (Public)</option>
              <option value="draft">Draft (Private)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <MediaUploadField
          label="Research PDF or Working Paper (optional)"
          helperText="Upload a PDF report to Google Drive Research/ or pick from Media Library."
          folder="research"
          category="research"
          contextSlug={title}
          value={documentUrl}
          mediaId={documentMediaId}
          mediaFiles={mediaFiles}
          driveConfig={driveConfig}
          onChange={(url, _name, nextMediaId) => {
            setDocumentUrl(url);
            setDocumentMediaId(nextMediaId ?? '');
          }}
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{editing ? 'Update Research' : 'Add Research'}</span>
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs text-[#94A3B8]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {research.map((item) => (
          <div
            key={item.id}
            className="kl-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          >
            <div>
              <p className="text-xs text-[#22D3EE]">
                {item.stage} · {item.publishState}
              </p>
              <p className="mt-0.5 font-display text-base font-semibold text-[#F8FAFC]">
                {item.title}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadForEdit(item)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#F8FAFC]"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => void deleteResearch(item.id, item.title)}
                aria-label={`Delete ${item.title}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperienceManager({
  experiences,
  mediaFiles = [],
  driveConfig = null,
}: {
  experiences: ExperienceEntry[];
  mediaFiles?: MediaFileRecord[];
  driveConfig?: DriveWorkspaceConfig | null;
}) {
  const { setSaving, setSaved, setSyncError } = useSyncStatus();
  const [editing, setEditing] = useState<ExperienceEntry | null>(null);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [entryType, setEntryType] = useState<ExperienceType>('Education');
  const [dateRange, setDateRange] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [certificateMediaId, setCertificateMediaId] = useState('');
  const [publishState, setPublishState] = useState<SimplePublishState>('published');
  const [error, setError] = useState<string | null>(null);

  const loadForEdit = (item: ExperienceEntry) => {
    setEditing(item);
    setTitle(item.title);
    setOrganization(item.organization);
    setEntryType(item.entryType);
    setDateRange(item.dateRange);
    setLocation(item.location ?? '');
    setDescription(item.description ?? '');
    setVerificationUrl(item.verificationUrl ?? '');
    setCertificateMediaId(item.certificateMediaId ?? '');
    setPublishState(item.publishState);
    setError(null);
  };

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setOrganization('');
    setEntryType('Education');
    setDateRange('');
    setLocation('');
    setDescription('');
    setVerificationUrl('');
    setCertificateMediaId('');
    setPublishState('published');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = experienceSchema.safeParse({
      title,
      organization,
      entryType,
      dateRange,
      location,
      description,
      verificationUrl,
      certificateMediaId,
      publishState,
      sortOrder: editing?.sortOrder ?? experiences.length + 1,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check education/experience fields.');
      return;
    }
    setSaving();
    try {
      await saveExperience(parsed.data, editing?.id);
      setSaved();
      resetForm();
    } catch {
      setSyncError();
      setError('Failed to save record.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-400/15 pb-5">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Education & Experience
        </h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Add education, industrial attachment, technical training, or verified certifications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kl-surface space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
          {editing ? `Edit: ${editing.title}` : 'Add education or experience'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="exp-title" className="block text-xs font-medium text-[#F8FAFC]">
              Role, degree, or credential title
            </label>
            <input
              id="exp-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="exp-org" className="block text-xs font-medium text-[#F8FAFC]">
              Institution or organization
            </label>
            <input
              id="exp-org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="exp-type" className="block text-xs font-medium text-[#F8FAFC]">
              Category
            </label>
            <select
              id="exp-type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as ExperienceType)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              {EXPERIENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="exp-dates" className="block text-xs font-medium text-[#F8FAFC]">
              Date range
            </label>
            <input
              id="exp-dates"
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              placeholder="e.g., 2023 — Present"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="exp-loc" className="block text-xs font-medium text-[#F8FAFC]">
              Location (optional)
            </label>
            <input
              id="exp-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="exp-pub" className="block text-xs font-medium text-[#F8FAFC]">
              Visibility
            </label>
            <select
              id="exp-pub"
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as SimplePublishState)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            >
              <option value="published">Published (Public)</option>
              <option value="draft">Draft (Private)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="exp-desc" className="block text-xs font-medium text-[#F8FAFC]">
            Description
          </label>
          <textarea
            id="exp-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3 text-sm text-[#F8FAFC]"
          />
        </div>
        <div>
          <label htmlFor="exp-verify" className="block text-xs font-medium text-[#F8FAFC]">
            External Verification URL (optional, for online badges/certificates)
          </label>
          <input
            id="exp-verify"
            type="url"
            value={verificationUrl}
            onChange={(e) => setVerificationUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
          />
        </div>
        <MediaUploadField
          label="Or upload Certificate / Supporting PDF to Google Drive (optional)"
          helperText="Stores file inside KLARENCY MEDIA/Certificates without external link copy-paste."
          folder="research"
          category={entryType === 'Certification' ? 'certificate' : 'experience'}
          contextSlug={title}
          value={verificationUrl}
          mediaId={certificateMediaId}
          mediaFiles={mediaFiles}
          driveConfig={driveConfig}
          onChange={(url, _name, nextMediaId) => {
            setVerificationUrl(url);
            setCertificateMediaId(nextMediaId ?? '');
          }}
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{editing ? 'Update Entry' : 'Add Entry'}</span>
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs text-[#94A3B8]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {experiences.map((exp) => (
          <div
            key={exp.id}
            className="kl-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          >
            <div>
              <p className="text-xs text-[#22D3EE]">
                {exp.entryType} · {exp.dateRange} · {exp.publishState}
              </p>
              <p className="mt-0.5 font-display text-base font-semibold text-[#F8FAFC]">
                {exp.title}
              </p>
              <p className="text-xs text-[#94A3B8]">{exp.organization}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadForEdit(exp)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#F8FAFC]"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => void deleteExperience(exp.id, exp.title)}
                aria-label={`Delete ${exp.title}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
