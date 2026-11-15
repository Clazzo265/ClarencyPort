import type {
  ContactMessage,
  DevStatus,
  ExperienceEntry,
  Project,
  PublicProfile,
  ResearchEntry,
  SearchableItem,
  Skill,
  SyncStatus,
} from '../types/portfolio';

export interface ProjectStatusCounts {
  total: number;
  published: number;
  draft: number;
  archived: number;
  trashed: number;
  byDevStatus: Record<DevStatus, number>;
}

export function computeProjectCounts(projects: Project[]): ProjectStatusCounts {
  const byDevStatus: Record<DevStatus, number> = {
    Completed: 0,
    'In progress': 0,
    Prototype: 0,
    Experimental: 0,
    Archived: 0,
  };

  let published = 0;
  let draft = 0;
  let archived = 0;
  let trashed = 0;

  for (const p of projects) {
    if (p.publishState === 'published') published += 1;
    else if (p.publishState === 'draft') draft += 1;
    else if (p.publishState === 'archived') archived += 1;
    else if (p.publishState === 'trashed') trashed += 1;

    if (p.publishState !== 'trashed' && byDevStatus[p.devStatus] !== undefined) {
      byDevStatus[p.devStatus] += 1;
    }
  }

  return {
    total: projects.filter((p) => p.publishState !== 'trashed').length,
    published,
    draft,
    archived,
    trashed,
    byDevStatus,
  };
}

export interface ProfileCompletionItem {
  key: string;
  label: string;
  completed: boolean;
}

export function computeProfileCompletion(
  profile: PublicProfile | null,
  projects: Project[],
  skills: Skill[],
): { percent: number; items: ProfileCompletionItem[] } {
  const items: ProfileCompletionItem[] = [
    {
      key: 'identity',
      label: 'Identity & tagline configured',
      completed: Boolean(profile?.ownerName && profile?.headline && profile?.tagline),
    },
    {
      key: 'bio',
      label: 'Biography written',
      completed: Boolean(profile?.shortBio && profile.shortBio.trim().length >= 30),
    },
    {
      key: 'projects',
      label: 'At least one published project',
      completed: projects.some((p) => p.publishState === 'published'),
    },
    {
      key: 'skills',
      label: 'Technical skills published',
      completed: skills.some((s) => s.publishState === 'published'),
    },
    {
      key: 'links',
      label: 'GitHub or LinkedIn connected',
      completed: Boolean(profile?.githubUrl || profile?.linkedinUrl),
    },
    {
      key: 'cv',
      label: 'CV PDF uploaded & configured',
      completed: Boolean(profile?.cvUrl && profile?.cvFileName),
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const percent = Math.round((completedCount / items.length) * 100);
  return { percent, items };
}

export function filterPublicProjects(
  projects: Project[],
  options: { query?: string; devStatus?: DevStatus | 'All'; technology?: string | 'All' },
): Project[] {
  const normalizedQuery = (options.query ?? '').trim().toLowerCase();
  const statusFilter = options.devStatus ?? 'All';
  const techFilter = options.technology ?? 'All';

  return projects
    .filter((p) => p.publishState === 'published')
    .filter((p) => (statusFilter === 'All' ? true : p.devStatus === statusFilter))
    .filter((p) =>
      techFilter === 'All'
        ? true
        : p.technologies.some((t) => t.toLowerCase() === techFilter.toLowerCase()),
    )
    .filter((p) => {
      if (!normalizedQuery) return true;
      return (
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.summary.toLowerCase().includes(normalizedQuery) ||
        p.technologies.some((t) => t.toLowerCase().includes(normalizedQuery))
      );
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
}

export function buildSearchIndex(params: {
  isAdmin: boolean;
  query: string;
  projects: Project[];
  skills: Skill[];
  research: ResearchEntry[];
  experiences: ExperienceEntry[];
  messages: ContactMessage[];
}): SearchableItem[] {
  const q = params.query.trim().toLowerCase();
  const results: SearchableItem[] = [];

  for (const project of params.projects) {
    if (!params.isAdmin && project.publishState !== 'published') continue;
    if (params.isAdmin && project.publishState === 'trashed') continue;
    results.push({
      id: project.id,
      kind: 'project',
      title: project.title,
      subtitle: project.summary,
      statusLabel: params.isAdmin ? `${project.devStatus} · ${project.publishState}` : project.devStatus,
      targetSection: 'projects',
    });
  }

  for (const skill of params.skills) {
    if (!params.isAdmin && skill.publishState !== 'published') continue;
    results.push({
      id: skill.id,
      kind: 'skill',
      title: skill.name,
      subtitle: `${skill.category} · ${skill.proficiency}`,
      statusLabel: params.isAdmin ? skill.publishState : skill.proficiency,
      targetSection: 'skills',
    });
  }

  for (const item of params.research) {
    if (!params.isAdmin && item.publishState !== 'published') continue;
    results.push({
      id: item.id,
      kind: 'research',
      title: item.title,
      subtitle: item.summary,
      statusLabel: item.stage,
      targetSection: 'research',
    });
  }

  for (const exp of params.experiences) {
    if (!params.isAdmin && exp.publishState !== 'published') continue;
    results.push({
      id: exp.id,
      kind: 'experience',
      title: exp.title,
      subtitle: `${exp.organization} · ${exp.dateRange}`,
      statusLabel: exp.entryType,
      targetSection: 'experience',
    });
  }

  // Strictly enforce admin boundary: contact messages are NEVER indexed for non-admins
  if (params.isAdmin) {
    for (const msg of params.messages) {
      results.push({
        id: msg.id,
        kind: 'message',
        title: `${msg.subject} — ${msg.senderName}`,
        subtitle: msg.message,
        statusLabel: msg.status,
        targetSection: 'messages',
      });
    }
  }

  if (!q) return results.slice(0, 12);

  return results
    .filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.statusLabel ?? '').toLowerCase().includes(q),
    )
    .slice(0, 15);
}

export function getSyncStatusCopy(status: SyncStatus, lastSavedAt?: string | null): {
  label: string;
  tone: 'neutral' | 'active' | 'success' | 'warning' | 'danger';
} {
  switch (status) {
    case 'saving':
      return { label: 'Saving to cloud…', tone: 'active' };
    case 'saved':
      return {
        label: lastSavedAt ? `Saved · ${lastSavedAt}` : 'Saved to cloud',
        tone: 'success',
      };
    case 'unsaved':
      return { label: 'Changes not saved', tone: 'warning' };
    case 'offline':
      return { label: 'Offline — local draft protected', tone: 'warning' };
    case 'reconnecting':
      return { label: 'Reconnecting…', tone: 'active' };
    case 'waiting-sync':
      return { label: 'Waiting to sync', tone: 'warning' };
    case 'error':
      return { label: 'Sync failed — retry required', tone: 'danger' };
    default:
      return { label: 'Ready', tone: 'neutral' };
  }
}

export function formatMalawiTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function canSubmitContact(
  lastSubmitTimestampMs: number | null,
  nowMs: number,
  cooldownMs = 30_000,
): { allowed: boolean; waitSeconds: number } {
  if (!lastSubmitTimestampMs) return { allowed: true, waitSeconds: 0 };
  const elapsed = nowMs - lastSubmitTimestampMs;
  if (elapsed >= cooldownMs) return { allowed: true, waitSeconds: 0 };
  return { allowed: false, waitSeconds: Math.ceil((cooldownMs - elapsed) / 1000) };
}
