import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  FileText,
  FolderPlus,
  Image,
  Layers,
  Mail,
  UserCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  AuditLog,
  ContactMessage,
  Project,
  PublicProfile,
  Skill,
} from '../../types/portfolio';
import {
  computeProfileCompletion,
  computeProjectCounts,
  formatMalawiTime,
} from '../../utils/portfolioLogic';

export type AdminSection =
  | 'overview'
  | 'wizard'
  | 'projects'
  | 'media'
  | 'profile'
  | 'skills'
  | 'research'
  | 'experience'
  | 'messages';

interface DashboardHomeProps {
  profile: PublicProfile;
  projects: Project[];
  skills: Skill[];
  messages: ContactMessage[];
  auditLogs: AuditLog[];
  hasRecoverableDraft: boolean;
  onNavigate: (section: AdminSection) => void;
  onReopenGuide: () => void;
}

export function DashboardHome({
  profile,
  projects,
  skills,
  messages,
  auditLogs,
  hasRecoverableDraft,
  onNavigate,
  onReopenGuide,
}: DashboardHomeProps) {
  const counts = computeProjectCounts(projects);
  const completion = computeProfileCompletion(profile, projects, skills);
  const unreadMessages = messages.filter((m) => m.status === 'unread').length;

  const quickActions: Array<{
    label: string;
    desc: string;
    icon: typeof FolderPlus;
    action: () => void;
    href?: string;
  }> = [
    {
      label: 'Add a project',
      desc: 'Launch the 9-step guided project creator.',
      icon: FolderPlus,
      action: () => onNavigate('wizard'),
    },
    {
      label: 'Media Library',
      desc: 'Upload photos & PDFs to Google Drive, crop, and manage visibility.',
      icon: Image,
      action: () => onNavigate('media'),
    },
    {
      label: 'Edit my profile',
      desc: 'Update headline, bio, portrait, and links.',
      icon: UserCog,
      action: () => onNavigate('profile'),
    },
    {
      label: 'Upload my CV',
      desc: 'Replace your PDF CV or toggle public download.',
      icon: FileText,
      action: () => onNavigate('profile'),
    },
    {
      label: 'Manage skills',
      desc: 'Organize categories and honest proficiency levels.',
      icon: Layers,
      action: () => onNavigate('skills'),
    },
    {
      label: 'Add research',
      desc: 'Document research interests or ongoing studies.',
      icon: BookOpen,
      action: () => onNavigate('research'),
    },
    {
      label: 'View messages',
      desc: `${unreadMessages} unread inquiry${unreadMessages === 1 ? '' : 's'} waiting.`,
      icon: Mail,
      action: () => onNavigate('messages'),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-400/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
            Welcome back, {profile.ownerName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage your public portfolio content, drafts, and private visitor messages safely.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onReopenGuide}
            className="min-h-[44px] rounded-lg border border-slate-400/20 bg-[#080D1C] px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Open Studio Guide
          </button>
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
          >
            <span>Preview my website</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {(hasRecoverableDraft || !profile.cvUrl) && (
        <div className="space-y-3">
          {hasRecoverableDraft && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="font-medium">Recoverable local project draft detected</p>
                  <p className="mt-0.5 text-xs text-amber-200/80">
                    An unsynced draft from a previous session is safely preserved in IndexedDB.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('wizard')}
                className="min-h-[40px] rounded-lg bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
              >
                Resume Draft
              </button>
            </div>
          )}

          {!profile.cvUrl && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-400/20 bg-[#080D1C] p-4 text-sm text-[#94A3B8]">
              <p>
                No CV PDF is uploaded yet. Visitors currently see a notice that CV download is
                unavailable.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="min-h-[40px] rounded-lg border border-slate-400/20 px-3.5 py-2 text-xs font-medium text-[#22D3EE] hover:bg-[#101A2E]"
              >
                Upload CV
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kl-surface rounded-xl p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Profile completion</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#F8FAFC] tabular-nums">
            {completion.percent}%
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-400/20">
            <div
              className="h-full bg-[#22D3EE]"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>

        <div className="kl-surface rounded-xl p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Published projects</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#F8FAFC] tabular-nums">
            {counts.published}
          </p>
          <p className="mt-2 text-xs text-[#94A3B8] tabular-nums">
            {counts.draft} draft · {counts.archived} archived
          </p>
        </div>

        <div className="kl-surface rounded-xl p-5">
          <p className="text-xs font-medium text-[#94A3B8]">By development stage</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#F8FAFC] tabular-nums">
            {counts.total}
          </p>
          <p className="mt-2 text-xs text-[#94A3B8] tabular-nums">
            {counts.byDevStatus.Completed} done · {counts.byDevStatus['In progress']} active ·{' '}
            {counts.byDevStatus.Prototype} proto
          </p>
        </div>

        <div className="kl-surface rounded-xl p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Unread messages</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#22D3EE] tabular-nums">
            {unreadMessages}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className="mt-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Open inbox ({messages.length} total)
          </button>
        </div>
      </div>

      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="font-display text-lg font-semibold text-[#F8FAFC]"
        >
          Quick Actions
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="kl-surface flex items-start gap-4 rounded-xl p-5 text-left transition-colors hover:border-[#22D3EE]/40 hover:bg-[#101A2E]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/15 text-[#22D3EE]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-[#F8FAFC]">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="kl-surface rounded-xl p-6 lg:col-span-5">
          <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
            Portfolio Checklist
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {completion.items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className={item.completed ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}>
                  {item.label}
                </span>
                <span
                  className={`font-mono text-xs ${
                    item.completed ? 'text-emerald-300' : 'text-[#94A3B8]'
                  }`}
                >
                  {item.completed ? 'Done' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="kl-surface rounded-xl p-6 lg:col-span-7">
          <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
            Recent Activity
          </h2>
          {auditLogs.length === 0 ? (
            <p className="mt-4 text-sm text-[#94A3B8]">
              Administrative updates will be logged here as you edit and publish content.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-400/15">
              {auditLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                  <span className="text-[#F8FAFC]/90">{log.summary}</span>
                  <span className="shrink-0 font-mono text-xs text-[#94A3B8] tabular-nums">
                    {formatMalawiTime(log.createdAt) || 'Just now'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
